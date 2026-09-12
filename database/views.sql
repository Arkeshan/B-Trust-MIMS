-- (how many transactions each agent process) 
CREATE OR REPLACE VIEW vw_agent_transaction_summary AS
SELECT
    s.person_id            AS agent_person_id,
    p.first_name,
    p.last_name,
    s.branch_id,
    COUNT(t.txn_id)         AS total_transactions,
    COALESCE(SUM(t.amount), 0) AS total_value
FROM STAFF s
JOIN PERSON p ON p.person_id = s.person_id
LEFT JOIN TRANSACTION t ON t.staff_person_id = s.person_id
WHERE s.role = 'agent'
GROUP BY s.person_id, p.first_name, p.last_name, s.branch_id;


-- (summing up the total deposits and withdrawals)
CREATE OR REPLACE VIEW vw_account_transaction_summary AS
SELECT
    sa.account_no,
    sa.balance                                                    AS current_balance,
    sa.status,
    COUNT(t.txn_id)                                                AS total_transactions,
    COALESCE(SUM(CASE WHEN t.txn_type = 'deposit'    THEN t.amount END), 0) AS total_deposits,
    COALESCE(SUM(CASE WHEN t.txn_type = 'withdrawal' THEN t.amount END), 0) AS total_withdrawals,
    COALESCE(SUM(CASE WHEN t.txn_type = 'interest'   THEN t.amount END), 0) AS total_interest_credited
FROM SAVINGS_ACCOUNT sa
LEFT JOIN TRANSACTION t ON t.account_no = sa.account_no
GROUP BY sa.account_no, sa.balance, sa.status;


-- (calculate maturity dates and expected interest payouts for active fixed deposits)
CREATE OR REPLACE VIEW vw_active_fd_payouts AS
SELECT
    fd.fd_acc_no,
    fd.account_no,
    fd.investment,
    fd.start_date,
    fd.interest_paid_to_date,
    fd.next_payout_date,
    fp.term_months,
    fp.interest_rate
FROM FIXED_DEPOSIT fd
JOIN FD_PLAN fp        ON fp.fd_plan_id = fd.fd_plan_id
JOIN SAVINGS_ACCOUNT sa ON sa.account_no = fd.account_no
WHERE sa.status = 'active';


-- (tells that which accout types are costing them the most in iterest payouts each month)
CREATE OR REPLACE VIEW vw_monthly_interest_by_account_type AS
SELECT
    ap.plan_name,
    DATE_FORMAT(t.timestamp, '%Y-%m') AS payout_month,
    COUNT(t.txn_id)                    AS interest_transactions,
    SUM(t.amount)                      AS total_interest_paid
FROM TRANSACTION t
JOIN SAVINGS_ACCOUNT sa ON sa.account_no = t.account_no
JOIN ACCOUNT_PLAN ap    ON ap.plan_id = sa.plan_id
WHERE t.txn_type = 'interest'
GROUP BY ap.plan_name, DATE_FORMAT(t.timestamp, '%Y-%m');


-- (this creats a summary of customer engagement)
CREATE OR REPLACE VIEW vw_customer_activity AS
SELECT
    c.person_id AS customer_person_id,
    p.first_name,
    p.last_name,
    COALESCE(SUM(CASE WHEN t.txn_type = 'deposit'    THEN t.amount END), 0) AS total_deposits,
    COALESCE(SUM(CASE WHEN t.txn_type = 'withdrawal' THEN t.amount END), 0) AS total_withdrawals,
    COALESCE(SUM(CASE
        WHEN t.txn_type = 'deposit' THEN t.amount
        WHEN t.txn_type = 'withdrawal' THEN -t.amount
        ELSE 0 END), 0) AS net_balance_change
FROM CUSTOMER c
JOIN PERSON p          ON p.person_id = c.person_id
JOIN ACCOUNT_HOLDER ah ON ah.person_id = c.person_id
JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
LEFT JOIN TRANSACTION t ON t.account_no = sa.account_no
GROUP BY c.person_id, p.first_name, p.last_name;
