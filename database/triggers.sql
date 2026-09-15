DELIMITER //
CREATE TRIGGER before_transaction_insert
BEFORE INSERT ON TRANSACTION
FOR EACH ROW
BEGIN
    DECLARE current_balance DECIMAL(15,2);
    DECLARE required_min_balance DECIMAL(12,2);

    SELECT sa.balance, ap.min_balance 
    INTO current_balance, required_min_balance
    FROM SAVINGS_ACCOUNT sa
    JOIN ACCOUNT_PLAN ap ON sa.plan_id = ap.plan_id
    WHERE sa.account_no = NEW.account_no;

    IF NEW.txn_type = 'withdrawal' THEN
        IF (current_balance - NEW.amount) < required_min_balance THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transaction Denied: Insufficient funds or minimum balance breached.';
        ELSE
            SET NEW.balance_after = current_balance - NEW.amount;
            UPDATE SAVINGS_ACCOUNT 
            SET balance = NEW.balance_after 
            WHERE account_no = NEW.account_no;
        END IF;

    ELSEIF NEW.txn_type IN ('deposit', 'interest') THEN
        SET NEW.balance_after = current_balance + NEW.amount;
        UPDATE SAVINGS_ACCOUNT 
        SET balance = NEW.balance_after 
        WHERE account_no = NEW.account_no;
    END IF;

END;

DELIMITER  ;




