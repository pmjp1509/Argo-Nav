# app/services/query_classifier.py

def is_depth_query(query: str) -> bool:
    """
    Detect whether query requires depth-level computation
    (i.e., needs Parquet loading).
    """
    q = query.lower()

    depth_keywords = [
        "depth", "meter", "m", "below", "above"
    ]

    stat_keywords = [
        "average", "mean", "variation",
        "min", "max", "range", "profile"
    ]

    return any(k in q for k in depth_keywords) or any(s in q for s in stat_keywords)