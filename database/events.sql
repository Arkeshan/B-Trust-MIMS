
SET GLOBAL event_scheduler=ON;

DROP EVENT IF EXISTS process_fd_interest_event;

CREATE EVENT process_fd_interest_event
    ON SCHEDULE EVERY 30 DAY
    STARTS CURRENT_TIMESTAMP+INTERVAL 30 DAY
    ON COMPLETION PRESERVE
    ENABLE
    DO
        CALL ProcessFDInterest();


