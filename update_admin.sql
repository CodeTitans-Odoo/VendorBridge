UPDATE company_employees
SET role = 'admin'
WHERE id = (SELECT id FROM company_employees ORDER BY id DESC LIMIT 1);
