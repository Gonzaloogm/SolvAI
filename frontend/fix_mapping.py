with open('src/pages/DataSourcesPage.jsx', 'r') as f:
    content = f.read()

bad_mapping = """         let iconBg = 'bg-[#336791]';
         let Icon = Cloud;
         let badge = 'Source';
         
         if (isStripe) { iconBg = 'bg-[#635bff]'; Icon = CreditCard; badge = 'Payments'; }
         else if (isXero) { iconBg = 'bg-[#00b0e0]'; Icon = Database; badge = 'Accounting'; }
         else if (isBelvo) { iconBg = 'bg-[#0570de]'; Icon = Globe; badge = 'Bank'; }
         else if (isPayPal) { iconBg = 'bg-[#003087]'; Icon = CreditCard; badge = 'Payments'; }
         
         return {
           name: (s.source_type || s.type || 'Source').charAt(0).toUpperCase() + (s.source_type || s.type || 'Source').slice(1).toLowerCase(),"""

good_mapping = """         let iconBg = 'bg-[#336791]';
         let Icon = Cloud;
         let badge = 'Source';
         let mappedName = (s.source_type || s.type || 'Source').charAt(0).toUpperCase() + (s.source_type || s.type || 'Source').slice(1).toLowerCase();
         
         if (isStripe) { iconBg = 'bg-[#635bff]'; Icon = CreditCard; badge = 'Payments'; mappedName = 'Stripe'; }
         else if (isXero) { iconBg = 'bg-[#00b0e0]'; Icon = Database; badge = 'Accounting'; mappedName = 'Xero'; }
         else if (isBelvo) { iconBg = 'bg-[#0570de]'; Icon = Globe; badge = 'Bank'; mappedName = 'Bank Account (Open Banking)'; }
         else if (isPayPal) { iconBg = 'bg-[#003087]'; Icon = CreditCard; badge = 'Payments'; mappedName = 'PayPal'; }
         else if (typeLower === 'manual_upload' || typeLower === 'csv') { iconBg = 'bg-[#697386]'; Icon = FileUp; badge = 'File'; mappedName = 'CSV Upload'; }
         
         return {
           name: mappedName,"""

content = content.replace(bad_mapping, good_mapping)

with open('src/pages/DataSourcesPage.jsx', 'w') as f:
    f.write(content)
