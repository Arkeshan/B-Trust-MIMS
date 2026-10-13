DELIMITER $$

DROP PROCEDURE IF EXISTS ProcessFDInterest$$

CREATE PROCEDURE ProcessFDInterest()
BEGIN

    DECLARE v_fd_acc_no        VARCHAR(12);
    DECLARE v_account_no       VARCHAR(12);
    DECLARE v_investment       DECIMAL(15,2);
    DECLARE v_annual_rate      DECIMAL(5,2);
    DECLARE v_next_payout_date DATE;

    DECLARE v_maturity_date    DATE;
    DECLARE v_payout_amount    DECIMAL(15,2);
    DECLARE v_new_balance      DECIMAL(15,2);
    DECLARE v_processed_count  INT DEFAULT 0;
    DECLARE v_skipped_count    INT DEFAULT 0;

    DECLARE v_done INT DEFAULT FALSE;

    DECLARE cur_fd CURSOR FOR
        SELECT
            fd_acc_no,
            account_no,
            investment,
            interest_rate,
            due_date,
            next_payout_date
        FROM vw_fd_status
        WHERE next_payout_date <= CURDATE()
          AND next_payout_date <= due_date;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    OPEN cur_fd;

    fd_loop: LOOP
        FETCH cur_fd INTO
            v_fd_acc_no,
            v_account_no,
            v_investment,
            v_annual_rate,
            v_maturity_date,
            v_next_payout_date;

        IF v_done THEN
            LEAVE fd_loop;
        END IF;

        IF v_next_payout_date > v_maturity_date THEN
            SET v_skipped_count = v_skipped_count + 1;
            ITERATE fd_loop;
        END IF;

        SET v_payout_amount = ROUND(
            v_investment * (v_annual_rate / 100.00) * (30.00 / 365.00),
            2
        );

        -- Lock savings account row for atomic balance update
        SELECT balance
        INTO   v_new_balance
        FROM   SAVINGS_ACCOUNT
        WHERE  account_no = v_account_no
        FOR UPDATE;

        -- Trigger before_transaction_insert handles balance_after calculation and SAVINGS_ACCOUNT update
        INSERT INTO TRANSACTION (
            account_no,
            staff_person_id,
            txn_type,
            amount,
            balance_after,
            timestamp,
            remarks
        ) VALUES (
            v_account_no,
            NULL,
            'interest',
            v_payout_amount,
            (v_new_balance + v_payout_amount),
            NOW(),
            CONCAT('Monthly interest payout for ', v_fd_acc_no)
        );

        UPDATE FIXED_DEPOSIT
        SET
            interest_paid_to_date = interest_paid_to_date + v_payout_amount,
            next_payout_date      = DATE_ADD(v_next_payout_date, INTERVAL 30 DAY)
        WHERE fd_acc_no = v_fd_acc_no;

        SET v_processed_count = v_processed_count + 1;

    END LOOP fd_loop;

    CLOSE cur_fd;

    COMMIT;

    SELECT
        v_processed_count  AS fds_processed,
        v_skipped_count    AS fds_skipped,
        NOW()              AS run_at;

END$$

DELIMITER ;
