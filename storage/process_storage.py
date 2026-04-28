import pandas as pd
import os

# Define the file name
file_name = 'account_usage_export.xlsx'

print(f"Looking for file: {file_name}...")

if not os.path.exists(file_name):
    print(f"ERROR: Could not find '{file_name}' in the current folder.")
else:
    try:
        # 1. Load the data
        df = pd.read_excel(file_name, engine='openpyxl')
        print("File loaded successfully!")

        # 2. Convert Date format
        df['Record Date'] = pd.to_datetime(df['Record Date'])

        # 3. Convert TB to GB (1 TB = 1024 GB)
        df['Active Storage (GB)'] = df['Active Storage (TB)'] * 1024

        # 4. Calculate Daily Charge with NEW Rate
        # Monthly Rate: $13.2 per TB
        # Daily Rate per GB = 13.2 / 1024 (TB to GB) / 30 (Days)
        # Daily Rate per GB = 13.20 / 1024 (TB to GB) / 30 (Days) for Swarthmore College
        # Daily Rate per GB = 14.3 / 1024 (TB to GB) / 30 (Days) for NY Thruway
        price_per_tb = 13.2
        days_in_month_avg = 30
        charge_factor = price_per_tb / 1024 / days_in_month_avg  # Matches your 0.000501302

        df['Daily Charge ($)'] = df['Active Storage (GB)'] * charge_factor

        # 5. Group by Month and Summarize
        df['YearMonth'] = df['Record Date'].dt.to_period('M')

        monthly_summary = df.groupby('YearMonth').agg(
            Total_Monthly_Charge=('Daily Charge ($)', 'sum')
        ).reset_index()

        # 6. Calculate Implied Monthly TB (Charge / 13.20)
        monthly_summary['Total Monthly TB'] = monthly_summary['Total_Monthly_Charge'] / price_per_tb

        # 7. Reorder columns and Format Rounding (2 digits)
        # Target order: YearMonth, Total Monthly TB, Total Monthly Charge
        monthly_summary = monthly_summary[['YearMonth', 'Total Monthly TB', 'Total_Monthly_Charge']]

        # Round the values to 2 decimal places
        monthly_summary['Total Monthly TB'] = monthly_summary['Total Monthly TB'].round(2)
        monthly_summary['Total_Monthly_Charge'] = monthly_summary['Total_Monthly_Charge'].round(2)

        # Display Results
        print("\nMonthly Summary:")
        print(monthly_summary)

        # Save to new CSV files
        df.to_csv('processed_daily_usage.csv', index=False)
        monthly_summary.to_csv('monthly_usage_summary.csv', index=False)
        print("\nSuccess! Files updated.")

    except Exception as e:
        print(f"\nAn error occurred: {e}")
