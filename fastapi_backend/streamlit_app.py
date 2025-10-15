"""
Tally Product Query Chatbot - Streamlit Frontend
-------------------------------------------------
A beautiful chat interface for querying product inventory and party information.
"""

import streamlit as st
import requests
import json
from datetime import datetime
import uuid

# ============================================================================
# CONFIGURATION
# ============================================================================

API_BASE_URL = "http://localhost:8000"
CHAT_ENDPOINT = f"{API_BASE_URL}/api/chat/tally/chat"

# ============================================================================
# PAGE CONFIGURATION
# ============================================================================

st.set_page_config(
    page_title="Tally Product Assistant",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ============================================================================
# CUSTOM CSS
# ============================================================================

st.markdown("""
<style>
    /* Main container */
    .main {
        background-color: #f5f7fa;
    }
    
    /* Chat messages */
    .user-message {
        background-color: #007bff;
        color: white;
        padding: 12px 16px;
        border-radius: 18px;
        margin: 8px 0;
        max-width: 70%;
        float: right;
        clear: both;
    }
    
    .assistant-message {
        background-color: #ffffff;
        color: #333;
        padding: 12px 16px;
        border-radius: 18px;
        margin: 8px 0;
        max-width: 70%;
        float: left;
        clear: both;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    
    .thinking-message {
        background-color: #f0f0f0;
        color: #666;
        padding: 8px 12px;
        border-radius: 12px;
        margin: 8px 0;
        max-width: 50%;
        float: left;
        clear: both;
        font-style: italic;
    }
    
    /* Thread list */
    .thread-item {
        padding: 12px;
        margin: 8px 0;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s;
    }
    
    .thread-item:hover {
        background-color: #e9ecef;
    }
    
    .thread-item.active {
        background-color: #007bff;
        color: white;
    }
    
    /* New thread button */
    .new-thread-btn {
        width: 100%;
        padding: 12px;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        margin-bottom: 20px;
    }
    
    .new-thread-btn:hover {
        background-color: #218838;
    }
    
    /* Input area */
    .stTextInput > div > div > input {
        border-radius: 20px;
        padding: 12px 20px;
    }
    
    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* Chat container */
    .chat-container {
        height: 600px;
        overflow-y: auto;
        padding: 20px;
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
</style>
""", unsafe_allow_html=True)

# ============================================================================
# SESSION STATE INITIALIZATION
# ============================================================================

if 'threads' not in st.session_state:
    st.session_state.threads = {}
    
if 'current_thread_id' not in st.session_state:
    # Create first thread
    thread_id = str(uuid.uuid4())
    st.session_state.threads[thread_id] = {
        'id': thread_id,
        'title': 'New Conversation',
        'messages': [],
        'created_at': datetime.now()
    }
    st.session_state.current_thread_id = thread_id

if 'is_processing' not in st.session_state:
    st.session_state.is_processing = False

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def create_new_thread():
    """Create a new conversation thread."""
    thread_id = str(uuid.uuid4())
    st.session_state.threads[thread_id] = {
        'id': thread_id,
        'title': 'New Conversation',
        'messages': [],
        'created_at': datetime.now()
    }
    st.session_state.current_thread_id = thread_id
    st.rerun()

def switch_thread(thread_id):
    """Switch to a different thread."""
    st.session_state.current_thread_id = thread_id
    st.rerun()

def get_current_thread():
    """Get the current active thread."""
    return st.session_state.threads[st.session_state.current_thread_id]

def add_message(role, content):
    """Add a message to the current thread."""
    thread = get_current_thread()
    thread['messages'].append({
        'role': role,
        'content': content,
        'timestamp': datetime.now()
    })
    
    # Update thread title with first user message
    if role == 'user' and thread['title'] == 'New Conversation':
        thread['title'] = content[:50] + ('...' if len(content) > 50 else '')

def send_query_to_api(query: str):
    """Send query to the FastAPI backend and stream the response."""
    try:
        response = requests.post(
            CHAT_ENDPOINT,
            json={"query": query},
            stream=True,
            timeout=60
        )
        
        if response.status_code == 200:
            full_response = ""
            
            for line in response.iter_lines():
                if line:
                    line_text = line.decode('utf-8')
                    if line_text.startswith('data: '):
                        data_str = line_text[6:]  # Remove 'data: ' prefix
                        try:
                            event = json.loads(data_str)
                            event_type = event.get('type')
                            content = event.get('content', {})
                            
                            if event_type == 'answer':
                                full_response = content.get('message', '')
                            elif event_type == 'error':
                                return f"❌ Error: {content.get('message', 'Unknown error')}"
                        except json.JSONDecodeError:
                            continue
            
            return full_response if full_response else "No response received"
        else:
            return f"❌ Error: API returned status code {response.status_code}"
            
    except requests.exceptions.RequestException as e:
        return f"❌ Error connecting to API: {str(e)}"

# ============================================================================
# SIDEBAR - THREAD LIST
# ============================================================================

with st.sidebar:
    st.title("💬 Conversations")
    
    # New thread button
    if st.button("➕ New Conversation", use_container_width=True, type="primary"):
        create_new_thread()
    
    st.divider()
    
    # List all threads
    st.subheader("Recent Chats")
    
    # Sort threads by creation time (newest first)
    sorted_threads = sorted(
        st.session_state.threads.values(),
        key=lambda x: x['created_at'],
        reverse=True
    )
    
    for thread in sorted_threads:
        is_active = thread['id'] == st.session_state.current_thread_id
        
        # Create a button for each thread
        button_label = f"{'🟢 ' if is_active else '⚪ '}{thread['title']}"
        
        if st.button(
            button_label,
            key=f"thread_{thread['id']}",
            use_container_width=True,
            type="primary" if is_active else "secondary"
        ):
            switch_thread(thread['id'])
    
    st.divider()
    
    # Info section
    st.markdown("""
    ### 🤖 About
    This AI assistant helps you:
    - 🔍 Search product inventory
    - 💰 Check product rates
    - 📊 View stock quantities
    - 👥 Query party/customer info
    
    Just ask naturally!
    """)

# ============================================================================
# MAIN CHAT INTERFACE
# ============================================================================

# Header
st.title("🤖 Tally Product Assistant")
st.markdown("Ask me anything about products, rates, or customer information!")

# Get current thread
current_thread = get_current_thread()

# Chat container
chat_container = st.container()

with chat_container:
    # Display chat history
    for message in current_thread['messages']:
        if message['role'] == 'user':
            st.markdown(f"""
            <div style="text-align: right; margin: 10px 0;">
                <div class="user-message">
                    {message['content']}
                </div>
            </div>
            """, unsafe_allow_html=True)
        else:
            st.markdown(f"""
            <div style="text-align: left; margin: 10px 0;">
                <div class="assistant-message">
                    {message['content']}
                </div>
            </div>
            """, unsafe_allow_html=True)

# Input area at the bottom
st.divider()

col1, col2 = st.columns([6, 1])

with col1:
    user_input = st.text_input(
        "Type your message...",
        key="user_input",
        placeholder="e.g., What is the price of RTX3060?",
        label_visibility="collapsed"
    )

with col2:
    send_button = st.button("Send", use_container_width=True, type="primary")

# Handle message sending
if send_button and user_input and not st.session_state.is_processing:
    # Add user message
    add_message('user', user_input)
    
    # Set processing flag
    st.session_state.is_processing = True
    
    # Show thinking indicator
    with st.spinner("🤔 Thinking..."):
        # Get response from API
        response = send_query_to_api(user_input)
        
        # Add assistant message
        add_message('assistant', response)
    
    # Clear processing flag
    st.session_state.is_processing = False
    
    # Rerun to update UI
    st.rerun()

# ============================================================================
# EXAMPLE QUERIES
# ============================================================================

if len(current_thread['messages']) == 0:
    st.markdown("---")
    st.subheader("💡 Try asking:")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🖥️ What is the price of RTX3060?", use_container_width=True):
            st.session_state.example_query = "What is the price of RTX3060?"
            st.rerun()
    
    with col2:
        if st.button("📦 Do you have any networking racks?", use_container_width=True):
            st.session_state.example_query = "Do you have any networking racks?"
            st.rerun()
    
    with col3:
        if st.button("💾 Tell me about 16gb DDR5 RAM", use_container_width=True):
            st.session_state.example_query = "Tell me about 16gb DDR5 RAM"
            st.rerun()

# Handle example queries
if 'example_query' in st.session_state:
    query = st.session_state.example_query
    del st.session_state.example_query
    
    # Add user message
    add_message('user', query)
    
    # Get response
    with st.spinner("🤔 Thinking..."):
        response = send_query_to_api(query)
        add_message('assistant', response)
    
    st.rerun()

# ============================================================================
# FOOTER
# ============================================================================

st.markdown("---")
st.markdown("""
<div style="text-align: center; color: #666; padding: 20px;">
    <p>Powered by LangGraph + Groq + FastAPI | Built with ❤️ using Streamlit</p>
</div>
""", unsafe_allow_html=True)
