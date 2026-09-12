DELIMITER //

CREATE TRIGGER before_transaction_insert
BEFORE INSERT ON TRANSACTION
FOR EACH ROW
BEGIN
    DECLARE current_balance DECIMAL(15,2);
    DECLARE required_min_balance DECIMAL(12,2);

    -- 1. Fetch the current account balance and the plan's minimum balance rule
    SELECT sa.balance, ap.min_balance 
    INTO current_balance, required_min_balance
    FROM SAVINGS_ACCOUNT sa
    JOIN ACCOUNT_PLAN ap ON sa.plan_id = ap.plan_id
    WHERE sa.account_no = NEW.account_no;

    -- 2. Logic for Withdrawals
    IF NEW.txn_type = 'withdrawal' THEN
        -- Check if the withdrawal breaches the minimum balance or causes an overdraft
        IF (current_balance - NEW.amount) < required_min_balance THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transaction Denied: Insufficient funds or minimum balance breached.';
        ELSE
            -- Calculate the new balance and update the core Savings Account table
            SET NEW.balance_after = current_balance - NEW.amount;
            UPDATE SAVINGS_ACCOUNT 
            SET balance = NEW.balance_after 
            WHERE account_no = NEW.account_no;
        END IF;

    -- 3. Logic for Deposits and Interest
    ELSEIF NEW.txn_type IN ('deposit', 'interest') THEN
        -- Calculate the new balance and update the core Savings Account table
        SET NEW.balance_after = current_balance + NEW.amount;
        UPDATE SAVINGS_ACCOUNT 
        SET balance = NEW.balance_after 
        WHERE account_no = NEW.account_no;
    END IF;

END //

DELIMITER ;




