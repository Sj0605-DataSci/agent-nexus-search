import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import tempfile
import os
import logging
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
import html

logger = logging.getLogger(__name__)

class PDFService:
    """Service for generating PDF documents from chat results"""
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.temp_dir = Path(tempfile.gettempdir()) / "discoverminds_pdfs"
        self.temp_dir.mkdir(exist_ok=True)
    
    def _clean_text(self, text: str) -> str:
        """Clean text for PDF generation"""
        if not text:
            return ""
        # Escape HTML entities and clean up text
        text = html.unescape(str(text))
        # Remove any remaining HTML tags
        import re
        text = re.sub(r'<[^>]+>', '', text)
        return text.strip()
    
    def _create_pdf_sync(
        self,
        filename: str,
        query: str,
        agent_name: str,
        chat_response: str,
        sources: List[Dict[str, Any]],
        user_name: str,
        chat_thread_id: str
    ) -> str:
        """Synchronously create PDF document"""
        try:
            # Create the PDF document
            doc = SimpleDocTemplate(
                filename,
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            # Get styles
            styles = getSampleStyleSheet()
            
            # Custom styles
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                alignment=TA_CENTER,
                textColor=colors.HexColor('#2c3e50')
            )
            
            heading_style = ParagraphStyle(
                'CustomHeading',
                parent=styles['Heading2'],
                fontSize=16,
                spaceAfter=12,
                spaceBefore=20,
                textColor=colors.HexColor('#34495e')
            )
            
            body_style = ParagraphStyle(
                'CustomBody',
                parent=styles['Normal'],
                fontSize=11,
                spaceAfter=12,
                alignment=TA_JUSTIFY,
                leftIndent=0,
                rightIndent=0
            )
            
            # Build the story (content)
            story = []
            
            # Title
            story.append(Paragraph("Search Results", title_style))
            story.append(Spacer(1, 20))
            
            # Query Information
            story.append(Paragraph("Search Details", heading_style))
            
            # Create info table
            info_data = [
                ['Query:', self._clean_text(query)],
                ['Agent:', self._clean_text(agent_name)],
                ['User:', self._clean_text(user_name or 'Anonymous')],
                ['Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')]
            ]
            
            info_table = Table(info_data, colWidths=[1.5*inch, 4.5*inch])
            info_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#ecf0f1')),
                ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#bdc3c7')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            
            story.append(info_table)
            story.append(Spacer(1, 30))
            
            # Chat Response
            story.append(Paragraph("Search Results", heading_style))
            
            # Split response into paragraphs and add them
            response_text = self._clean_text(chat_response)
            if response_text:
                # Split by double newlines to preserve paragraph structure
                paragraphs = response_text.split('\n\n')
                for para in paragraphs:
                    if para.strip():
                        story.append(Paragraph(para.strip(), body_style))
            else:
                story.append(Paragraph("No response content available.", body_style))
            
            story.append(Spacer(1, 30))
            
            # Sources section
            if sources:
                story.append(Paragraph("Sources and References", heading_style))
                
                for i, source in enumerate(sources, 1):
                    # Handle the new source data structure
                    if isinstance(source, dict):
                        # New format: {"title": "...", "value": "...", "short_url": "..."}
                        if 'title' in source and 'value' in source:
                            title = self._clean_text(source['title'])
                            url = source['value']
                            short_url = source.get('short_url', f'[{i}]')
                            
                            # Create source title with hyperlink
                            source_title = f"{short_url} {title}"
                            story.append(Paragraph(source_title, ParagraphStyle(
                                'SourceTitle',
                                parent=styles['Heading3'],
                                fontSize=12,
                                spaceAfter=6,
                                spaceBefore=15,
                                textColor=colors.HexColor('#2980b9')
                            )))
                            
                            # Create clickable URL
                            from reportlab.lib.utils import simpleSplit
                            url_para = Paragraph(f'<link href="{url}">{url}</link>', ParagraphStyle(
                                'URLStyle',
                                parent=styles['Normal'],
                                fontSize=10,
                                textColor=colors.HexColor('#0066cc'),
                                leftIndent=20
                            ))
                            story.append(url_para)
                            story.append(Spacer(1, 10))
                            
                        # Legacy format handling
                        elif 'url' in source or 'snippet' in source or 'content' in source:
                            # Source header
                            source_title = f"Source {i}"
                            if 'title' in source and source['title']:
                                source_title = f"Source {i}: {self._clean_text(source['title'])}"
                            elif 'url' in source and source['url']:
                                source_title = f"Source {i}: {self._clean_text(source['url'])}"
                            
                            story.append(Paragraph(source_title, ParagraphStyle(
                                'SourceTitle',
                                parent=styles['Heading3'],
                                fontSize=12,
                                spaceAfter=6,
                                spaceBefore=15,
                                textColor=colors.HexColor('#2980b9')
                            )))
                            
                            # Source details table
                            source_data = []
                            
                            if 'url' in source and source['url']:
                                url = source['url']
                                # Create clickable URL
                                url_link = f'<link href="{url}">{self._clean_text(url)}</link>'
                                source_data.append(['URL:', url_link])
                            
                            if 'title' in source and source['title']:
                                source_data.append(['Title:', self._clean_text(source['title'])])
                            
                            if 'snippet' in source and source['snippet']:
                                snippet = self._clean_text(source['snippet'])
                                if len(snippet) > 300:
                                    snippet = snippet[:300] + "..."
                                source_data.append(['Snippet:', snippet])
                            
                            if 'content' in source and source['content']:
                                content = self._clean_text(source['content'])
                                if len(content) > 500:
                                    content = content[:500] + "..."
                                source_data.append(['Content:', content])
                            
                            if source_data:
                                source_table = Table(source_data, colWidths=[1*inch, 5*inch])
                                source_table.setStyle(TableStyle([
                                    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8f9fa')),
                                    ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
                                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                                    ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
                                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dee2e6')),
                                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                ]))
                                story.append(source_table)
                                story.append(Spacer(1, 10))
                    else:
                        # Handle non-dict sources
                        story.append(Paragraph(f"Source {i}: {self._clean_text(str(source))}", body_style))
                        story.append(Spacer(1, 10))
            else:
                story.append(Paragraph("No sources available.", body_style))
            
            # Build PDF
            doc.build(story)
            logger.info(f"PDF created successfully: {filename}")
            return filename
            
        except Exception as e:
            logger.error(f"Error creating PDF: {str(e)}")
            raise
    
    async def create_chat_pdf(
        self,
        query: str,
        agent_name: str,
        chat_response: str,
        sources: List[Dict[str, Any]],
        user_name: str,
        chat_thread_id: str
    ) -> str:
        """Create PDF from chat results asynchronously"""
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = self.temp_dir / f"chat_results_{chat_thread_id}_{timestamp}.pdf"
        
        # Run PDF creation in thread pool
        loop = asyncio.get_event_loop()
        try:
            result_filename = await loop.run_in_executor(
                self.executor,
                self._create_pdf_sync,
                str(filename),
                query,
                agent_name,
                chat_response,
                sources,
                user_name,
                chat_thread_id
            )
            return result_filename
        except Exception as e:
            logger.error(f"Error in async PDF creation: {str(e)}")
            raise
    
    def cleanup_old_pdfs(self, max_age_hours: int = 24):
        """Clean up old PDF files"""
        try:
            import time
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            
            for pdf_file in self.temp_dir.glob("*.pdf"):
                if current_time - pdf_file.stat().st_mtime > max_age_seconds:
                    pdf_file.unlink()
                    logger.info(f"Cleaned up old PDF: {pdf_file}")
        except Exception as e:
            logger.error(f"Error cleaning up PDFs: {str(e)}")

# Global PDF service instance
pdf_service = PDFService()
