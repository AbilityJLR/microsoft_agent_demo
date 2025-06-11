import pandas as pd
import json

df = pd.read_excel("data.xlsx")
sales_data = df.to_dict(orient="records")
result = json.dumps({"sales_data": sales_data})

print(result)

