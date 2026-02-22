# using PremSQL (deprecated, replaced by Groq-based approach)
# from dotenv import load_dotenv
# load_dotenv()

# print("🔍 Testing PremSQL Text-to-SQL\n")

# try:
#     from app.services.text_to_sql import text_to_sql
#     import psycopg2
#     from app.core.config import settings

#     query = "What is the average temperature at 1000m depth in the Indian Ocean in December?"

#     print("📝 Query:")
#     print(query)

#     print("\n⚙ Generating SQL...\n")

#     sql = text_to_sql(query)

#     print("✅ Generated SQL:")
#     print(sql)

#     print("\n🚀 Executing SQL...\n")

#     conn = psycopg2.connect(settings.DATABASE_URL)
#     cur = conn.cursor()
#     cur.execute(sql)
#     rows = cur.fetchall()

#     print(f"📊 Rows returned: {len(rows)}")
#     if rows:
#         print("🔹 First row:")
#         print(rows[0])

#     cur.close()
#     conn.close()

# except Exception as e:
#     print("❌ ERROR:")
#     print(str(e))


# using Groq instead of PremSQL
from dotenv import load_dotenv
load_dotenv()

import psycopg2

from app.services.text_to_sql import text_to_sql
from app.core.config import settings
from app.services.llm_services import refine_user_query

def run_test():
    print("🔍 Testing Groq-based Text-to-SQL\n")

    # Example natural language query
    query = "argo floats in indian ocean"
    print("📝 User Query:")
    print(query)
    print("\n⚙ Generating SQL...\n")
    refined_query = refine_user_query(query)
    print("🔧 Refined Query:")
    print(refined_query)

    try:
        
        sql = text_to_sql(refined_query)

        print("✅ Generated SQL:")
        print(sql)

        print("\n🚀 Executing SQL...\n")

        conn = psycopg2.connect(settings.DATABASE_URL)
        cur = conn.cursor()

        cur.execute(sql)
        rows = cur.fetchall()

        print(f"📊 Rows returned: {len(rows)}")

        if rows:
            print("🔹 First row:")
            print(rows[0])

        cur.close()
        conn.close()

    except Exception as e:
        print("❌ ERROR DURING TEST:")
        print(str(e))


if __name__ == "__main__":
    run_test()