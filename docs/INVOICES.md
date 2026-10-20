# Invoice документи

Първо: Админ → Документи → Настройки на Invoice. Въведи Account number и двата Routing number. Те не се записват в GitHub или в публичния код.

След това: Админ → Документи → Invoice документи → Create New.

- Ръчен уникален номер, дата на документа и незадължителен падеж.
- 1–50 автомобила: VIN, марка, модел, лот, незадължителна година.
- За всеки автомобил: Delivery, Shipping, Dealer fee, Storage, Late fee, EV fee, Add services. Всички суми са USD с до два десетични знака.
- Total за реда, общият Total и Balance due се преизчисляват на сървъра. Payment е реално платената сума и по подразбиране е нула.
- Незадължителни Cargo information и бележки; празните транспортни полета не създават измислени данни.
- Seller, Bill to и платежните данни са предоставени от собственика. При създаване се записва защитено копие във всеки документ, запазено при следващи редакции.
- PDF се изтегля само след запис; при незапазени промени бутонът е скрит. При повече автомобили има продължение с повтарящи се колони и общ сбор само накрая.
- PDF е на английски по одобрения образец, с кирилица за въведени текстове. Използва текстово изписване на фирмата, без добавен подпис.

Достъп: само администратори, включително през REST и PDF endpoint. Клиентски вход не дава достъп. PDF отговорите са private/no-store и noindex.

Миграцията добавя само invoices, invoices_vehicles и invoice_settings; съществуващите BOS и клиентски данни не се променят. Down запазва издадените документи.

## Calendar dates and compact PDF
Invoice, due and shipping dates use native calendar controls without changing the stored date-only format.
New invoices default to a due date seven calendar days after the document date (today in Europe/Sofia by default).
Changing the document date in a new form moves the suggested due date unless manually overridden.
Saved invoices and explicit custom due dates remain unchanged; exporting PDF never resets the payment deadline.
The PDF uses a transparent logo prepared from the owner-supplied reference, compact party/cargo/vehicle rows, and repeated table headers on continuation pages.
