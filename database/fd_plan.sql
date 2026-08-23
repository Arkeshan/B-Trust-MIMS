CREATE TABLE FD_PLAN (
    fd_plan_id      INT AUTO_INCREMENT PRIMARY KEY,
    interest_rate   DECIMAL(5,2) NOT NULL,
    term_months     INT NOT NULL,

    CONSTRAINT chk_term_months CHECK (term_months IN (6, 12, 36)),
    CONSTRAINT chk_interest_rate CHECK (interest_rate > 0),
    CONSTRAINT uq_term_months UNIQUE (term_months)
);

INSERT INTO FD_PLAN (interest_rate, term_months) VALUES
(13.00, 6),
(14.00, 12),
(15.00, 36);
