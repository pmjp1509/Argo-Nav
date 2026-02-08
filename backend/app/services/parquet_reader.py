import pyarrow.parquet as pq
import pandas as pd

def load_profiles(rows):
    """Load parquet files from rows containing float_id, cycle_number, parquet_uri"""
    dfs = []
    for row in rows:
        # Handle both dict and tuple formats
        if isinstance(row, dict):
            float_id = row.get('float_id')
            cycle = row.get('cycle_number')
            parquet_uri = row.get('parquet_uri')
        else:
            float_id, cycle, parquet_uri = row
        
        if not parquet_uri:
            continue
            
        try:
            df = pq.read_table(parquet_uri).to_pandas()
            df["float_id"] = float_id
            df["cycle_number"] = cycle
            dfs.append(df)
        except Exception as e:
            print(f"Error loading parquet {parquet_uri}: {e}")
            continue
    
    if not dfs:
        return pd.DataFrame()
    return pd.concat(dfs, ignore_index=True)

def apply_qc(df):
    """Apply quality control filtering"""
    if df.empty:
        return df
    
    # If TEMP_QC column exists, filter by it; otherwise return all data
    if "TEMP_QC" in df.columns:
        qc_mask = df["TEMP_QC"].isin(["1", "2"])
        return df[qc_mask]
    
    print("Warning: TEMP_QC column not found in dataframe, returning all rows")
    return df

def compute_stats(df):
    """Compute statistics from loaded dataframe"""
    if df.empty:
        return {"error": "No data available"}
    
    try:
        stats = {
            "float_count": int(df["float_id"].nunique()) if "float_id" in df else 0,
            "profile_count": int(df["cycle_number"].nunique()) if "cycle_number" in df else 0,
        }
        
        if "PRES" in df and "TEMP" in df:
            stats["depth_range_dbar"] = f"{int(df['PRES'].min())}–{int(df['PRES'].max())}"
            stats["mean_temp_below_500m_c"] = round(
                df[df["PRES"] > 500]["TEMP"].mean(), 2
            ) if len(df[df["PRES"] > 500]) > 0 else None
            stats["min_temp_c"] = round(df["TEMP"].min(), 2)
            stats["max_temp_c"] = round(df["TEMP"].max(), 2)
        
        if "TEMP_QC" in df:
            qc_pass = len(df[df["TEMP_QC"].isin(["1", "2"])])
            stats["qc_pass_rate"] = f"{round((qc_pass / len(df) * 100) if len(df) > 0 else 0, 1)}%"
        
        return stats
    except Exception as e:
        print(f"Error computing stats: {e}")
        return {"error": str(e)}
