from app.services.llm_services import refine_user_query

query = "Wt is the avg temp at 1000m depth in indian Ocean during mon of dec?"
print("______Original Query______")
print(query)
print("______ Refine Query______")
print(refine_user_query(query))