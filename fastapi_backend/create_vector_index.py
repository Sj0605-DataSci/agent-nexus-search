# #!/usr/bin/env python3
# """
# Script to create covering index for linkedin_profiles vector collection.
# This will eliminate the UserWarning and significantly improve query performance.
# """

# import vecs
# from app.core.config import settings
# from urllib.parse import quote_plus

# def create_vector_index():
#     """Create covering index for linkedin_profiles collection."""
#     try:
#         # Initialize vector client
#         if settings.SUPABASE_USER and settings.SUPABASE_PASSWORD and settings.SUPABASE_HOST and settings.SUPABASE_PORT and settings.SUPABASE_DBNAME:
#             db_url = f"postgresql://{settings.SUPABASE_USER}:{quote_plus(settings.SUPABASE_PASSWORD)}@{settings.SUPABASE_HOST}:{settings.SUPABASE_PORT}/{settings.SUPABASE_DBNAME}?sslmode=require"
#         else:
#             db_url = settings.DATABASE_URL
            
#         print(f"Connecting to vector database...")
#         vecs_client = vecs.create_client(db_url)
        
#         # Get the linkedin_profiles collection
#         print(f"Getting linkedin_profiles collection...")
#         linkedin_profiles_collection = vecs_client.get_collection("linkedin_profiles")
        
#         # Create covering index for cosine distance queries
#         print(f"Creating covering index for cosine distance...")
#         linkedin_profiles_collection.create_index(
#             measure=vecs.IndexMeasure.cosine_distance,
#             index_arguments={"m": 16, "ef_construction": 64}
#         )
        
#         print(f"✅ Successfully created covering index for linkedin_profiles collection")
#         print(f"✅ Vector queries will now be much faster and warning-free")
        
#     except Exception as e:
#         print(f"❌ Failed to create vector index: {str(e)}")
#         print(f"This may be because:")
#         print(f"  - Collection doesn't exist yet")
#         print(f"  - Index already exists")
#         print(f"  - Database connection issues")

# if __name__ == "__main__":
#     create_vector_index()
