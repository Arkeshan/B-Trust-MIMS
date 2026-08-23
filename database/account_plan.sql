CREATE TABLE account_plan (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_name VARCHAR(30) NOT NULL UNIQUE,
    interest_rate DECIMAL(5,2) NOT NULL,
    min_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT chk_account_plan_interest
        CHECK (interest_rate >= 0 AND interest_rate <= 100),

    CONSTRAINT chk_account_plan_min_balance
        CHECK (min_balance >= 0)
);

INSERT INTO account_plan
    (plan_name, interest_rate, min_balance)
VALUES
    ('Children', 12.00, 0.00),
    ('Teen', 11.00, 500.00),
    ('Adult', 10.00, 1000.00),
    ('Senior', 13.00, 1000.00),
    ('Joint', 7.00, 5000.00);
