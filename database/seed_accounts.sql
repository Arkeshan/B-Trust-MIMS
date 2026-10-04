-- ==========================================
-- SEED DATA: CUSTOMERS, ACCOUNTS & TRANSACTIONS
-- ==========================================

-- 1. Create 15 Customer Login Accounts
INSERT INTO USER_ACCOUNT (username, password_hash, email, type, status) VALUES
    ('cust_1', 'pass1', 'c1@mail.com', 'customer', 'active'),
    ('cust_2', 'pass2', 'c2@mail.com', 'customer', 'active'),
    ('cust_3', 'pass3', 'c3@mail.com', 'customer', 'active'),
    ('cust_4', 'pass4', 'c4@mail.com', 'customer', 'active'),
    ('cust_5', 'pass5', 'c5@mail.com', 'customer', 'active'),
    ('cust_6', 'pass6', 'c6@mail.com', 'customer', 'active'),
    ('cust_7', 'pass7', 'c7@mail.com', 'customer', 'active'),
    ('cust_8', 'pass8', 'c8@mail.com', 'customer', 'active'),
    ('cust_9', 'pass9', 'c9@mail.com', 'customer', 'active'),
    ('cust_10', 'pass10', 'c10@mail.com', 'customer', 'active'),
    ('cust_11', 'pass11', 'c11@mail.com', 'customer', 'active'),
    ('cust_12', 'pass12', 'c12@mail.com', 'customer', 'active'),
    ('cust_13', 'pass13', 'c13@mail.com', 'customer', 'active'),
    ('cust_14', 'pass14', 'c14@mail.com', 'customer', 'active'),
    ('cust_15', 'pass15', 'c15@mail.com', 'customer', 'active');

-- 2. Create 15 Customer Profiles (IDs 6 to 20, as 1-5 are agents)
-- Includes two minors without NICs
INSERT INTO PERSON (first_name, last_name, nic, dob, phone_number, address, city) VALUES
    ('Amal', 'A', '198000000001', '1980-01-01', '0710000001', '1 St', 'Batticaloa'),
    ('Bimal', 'B', '198100000002', '1981-02-02', '0710000002', '2 St', 'Trinco'),
    ('Kamali', 'C', '198200000003', '1982-03-03', '0710000003', '3 St', 'Ampara'),
    ('Ruwan', 'D', '198300000004', '1983-04-04', '0710000004', '4 St', 'Batticaloa'),
    ('Saman', 'E', '198400000005', '1984-05-05', '0710000005', '5 St', 'Trinco'),
    ('Nayana', 'F', '198500000006', '1985-06-06', '0710000006', '6 St', 'Ampara'),
    ('Kasun', 'G', '198600000007', '1986-07-07', '0710000007', '7 St', 'Batticaloa'),
    ('Dasun', 'H', '198700000008', '1987-08-08', '0710000008', '8 St', 'Trinco'),
    ('Nuwan', 'I', '198800000009', '1988-09-09', '0710000009', '9 St', 'Ampara'),
    ('Piyumi', 'J', '198900000010', '1989-10-10', '0710000010', '10 St', 'Batticaloa'),
    ('Supun', 'K', '199000000011', '1990-11-11', '0710000011', '11 St', 'Trinco'),
    ('Lahiru', 'L', '199100000012', '1991-12-12', '0710000012', '12 St', 'Ampara'),
    ('Oshadi', 'M', '199200000013', '1992-01-13', '0710000013', '13 St', 'Batticaloa'),
    ('Child1', 'N', NULL, '2015-01-01', '0710000014', '14 St', 'Trinco'),
    ('Child2', 'O', NULL, '2016-01-01', '0710000015', '15 St', 'Ampara');

-- 3. Map Customers to Logins and Agents
INSERT INTO CUSTOMER (person_id, username, assigned_agent_person_id, guardian_person_id, registered_branch_id) VALUES
    (6, 'cust_1', 1, NULL, 1),
    (7, 'cust_2', 2, NULL, 2),
    (8, 'cust_3', 3, NULL, 3),
    (9, 'cust_4', 4, NULL, 1),
    (10, 'cust_5', 5, NULL, 2),
    (11, 'cust_6', 1, NULL, 1),
    (12, 'cust_7', 2, NULL, 2),
    (13, 'cust_8', 3, NULL, 3),
    (14, 'cust_9', 4, NULL, 1),
    (15, 'cust_10', 5, NULL, 2),
    (16, 'cust_11', 1, NULL, 1),
    (17, 'cust_12', 2, NULL, 2),
    (18, 'cust_13', 3, NULL, 3),
    (19, 'cust_14', 4, 6, 1),  -- Minor linked to guardian person_id 6
    (20, 'cust_15', 5, 7, 2);  -- Minor linked to guardian person_id 7

-- 4. Open Savings Accounts (Plan IDs: 1=Child, 2=Teen, 3=Adult, 4=Senior, 5=Joint)
INSERT INTO SAVINGS_ACCOUNT (account_no, plan_id, branch_id, balance, opened_date, status) VALUES
    ('ACC000000001', 3, 1, 10000.00, '2026-08-01', 'active'),
    ('ACC000000002', 3, 2, 15000.00, '2026-08-01', 'active'),
    ('ACC000000003', 3, 3, 20000.00, '2026-08-02', 'active'),
    ('ACC000000004', 3, 1, 5000.00, '2026-08-02', 'active'),
    ('ACC000000005', 3, 2, 12000.00, '2026-08-03', 'active'),
    ('ACC000000006', 5, 1, 50000.00, '2026-08-03', 'active'), -- Joint Account 1
    ('ACC000000007', 5, 2, 75000.00, '2026-08-04', 'active'), -- Joint Account 2
    ('ACC000000008', 1, 1, 2000.00, '2026-08-04', 'active'),  -- Child Account
    ('ACC000000009', 1, 2, 3000.00, '2026-08-05', 'active'),  -- Child Account
    ('ACC000000010', 3, 1, 5500.00, '2026-08-05', 'active');  -- Second Account for cust_1

-- 5. Map People to Accounts (Establishing the 2 Joint Accounts + Multiple Accounts)
INSERT INTO ACCOUNT_HOLDER (person_id, account_no) VALUES
    (6, 'ACC000000001'),
    (6, 'ACC000000010'), -- Person 6 (cust_1) has 2 accounts
    (7, 'ACC000000002'),
    (8, 'ACC000000003'),
    (9, 'ACC000000004'),
    (10, 'ACC000000005'),
    (11, 'ACC000000006'), (12, 'ACC000000006'), -- Two people share ACC006
    (13, 'ACC000000007'), (14, 'ACC000000007'), -- Two people share ACC007
    (19, 'ACC000000008'),
    (20, 'ACC000000009');

-- 6. Insert Batch Transactions for Dashboard Testing
INSERT INTO TRANSACTION (account_no, staff_person_id, txn_type, amount, balance_after) VALUES
    ('ACC000000001', 1, 'deposit', 5000.00, 15000.00),
    ('ACC000000001', 1, 'withdrawal', 1000.00, 14000.00),
    ('ACC000000002', 2, 'deposit', 10000.00, 25000.00),
    ('ACC000000006', 1, 'deposit', 20000.00, 70000.00),
    ('ACC000000006', 4, 'withdrawal', 5000.00, 65000.00),
    ('ACC000000008', 1, 'interest', 200.00, 2200.00);

-- 7. Fixed Deposit Sample
INSERT INTO FIXED_DEPOSIT (fd_acc_no, account_no, fd_plan_id, investment, start_date, interest_paid_to_date, next_payout_date) VALUES
    ('FD000000001', 'ACC000000001', 1, 1000.00, '2026-09-16', 0.00, '2026-10-16');