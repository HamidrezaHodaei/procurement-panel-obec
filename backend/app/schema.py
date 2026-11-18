"""MySQL/MariaDB schema (InnoDB, utf8mb4). Append new statements-lists to MIGRATIONS; each runs once."""

_T = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"

_AUDIT = """created_by VARCHAR(255) NOT NULL, created_at DATETIME NOT NULL,
    updated_by VARCHAR(255) NOT NULL, updated_at DATETIME NOT NULL"""

MIGRATIONS: list[list[str]] = [
    [
        f"""CREATE TABLE users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            full_name VARCHAR(255) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('admin','editor','viewer') NOT NULL DEFAULT 'editor',
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL,
            last_login DATETIME NULL
        ) {_T}""",
        f"CREATE TABLE companies (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, is_active TINYINT(1) NOT NULL DEFAULT 1) {_T}",
        f"CREATE TABLE item_categories (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, is_active TINYINT(1) NOT NULL DEFAULT 1) {_T}",
        f"""CREATE TABLE items (
            id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, category_id INT NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            UNIQUE KEY uq_item (name, category_id),
            FOREIGN KEY (category_id) REFERENCES item_categories(id) ON DELETE RESTRICT
        ) {_T}""",
        f"CREATE TABLE agents (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, is_active TINYINT(1) NOT NULL DEFAULT 1) {_T}",
        f"CREATE TABLE executors (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, is_active TINYINT(1) NOT NULL DEFAULT 1) {_T}",
        f"""CREATE TABLE brands (
            id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL,
            kind ENUM('domestic','foreign') NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1,
            UNIQUE KEY uq_brand (name, kind)
        ) {_T}""",
        f"""CREATE TABLE currencies (
            id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(10) NOT NULL UNIQUE, name VARCHAR(100) NOT NULL,
            symbol VARCHAR(20) NOT NULL DEFAULT '', decimals TINYINT NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1, CHECK (decimals BETWEEN 0 AND 4)
        ) {_T}""",
        f"""CREATE TABLE payment_methods (
            id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE,
            kind ENUM('cheque','cash','guarantee','other') NOT NULL, is_active TINYINT(1) NOT NULL DEFAULT 1
        ) {_T}""",
        f"CREATE TABLE guarantee_types (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, is_active TINYINT(1) NOT NULL DEFAULT 1) {_T}",
        f"""CREATE TABLE purchase_processes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            request_number VARCHAR(100) NOT NULL UNIQUE,
            company_id INT NOT NULL, item_id INT NOT NULL,
            start_date DATE NOT NULL,
            status ENUM('active','completed','cancelled') NOT NULL DEFAULT 'active',
            completed_at DATE NULL,
            agent_id INT NULL, agent_relation ENUM('direct','indirect') NULL, executor_id INT NULL,
            purchase_type ENUM('domestic','foreign') NOT NULL, brand_id INT NULL,
            actions_text MEDIUMTEXT NOT NULL, tender_winner VARCHAR(255) NOT NULL DEFAULT '',
            purchase_amount BIGINT NULL, purchase_currency_id INT NULL,
            proforma_date DATE NULL, proforma_amount BIGINT NULL, proforma_currency_id INT NULL,
            {_AUDIT},
            KEY idx_pp_company (company_id), KEY idx_pp_item (item_id), KEY idx_pp_start (start_date),
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE RESTRICT,
            FOREIGN KEY (executor_id) REFERENCES executors(id) ON DELETE RESTRICT,
            FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE RESTRICT,
            FOREIGN KEY (purchase_currency_id) REFERENCES currencies(id) ON DELETE RESTRICT,
            FOREIGN KEY (proforma_currency_id) REFERENCES currencies(id) ON DELETE RESTRICT,
            CHECK ((purchase_amount IS NULL) = (purchase_currency_id IS NULL)),
            CHECK ((proforma_amount IS NULL) = (proforma_currency_id IS NULL))
        ) {_T}""",
        f"""CREATE TABLE process_payment_methods (
            process_id INT NOT NULL, payment_method_id INT NOT NULL,
            PRIMARY KEY (process_id, payment_method_id),
            FOREIGN KEY (process_id) REFERENCES purchase_processes(id) ON DELETE CASCADE,
            FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT
        ) {_T}""",
        f"""CREATE TABLE cheques (
            id INT AUTO_INCREMENT PRIMARY KEY, process_id INT NOT NULL,
            cheque_number VARCHAR(100) NOT NULL, cheque_date DATE NOT NULL,
            amount BIGINT NOT NULL, currency_id INT NOT NULL,
            issuer_name VARCHAR(255) NOT NULL DEFAULT '',
            status ENUM('pending','cashed','bounced') NOT NULL DEFAULT 'pending',
            notes TEXT NOT NULL, {_AUDIT},
            KEY idx_cheques_process (process_id),
            FOREIGN KEY (process_id) REFERENCES purchase_processes(id) ON DELETE CASCADE,
            FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE RESTRICT,
            CHECK (amount >= 0)
        ) {_T}""",
        f"""CREATE TABLE payment_stages (
            id INT AUTO_INCREMENT PRIMARY KEY, process_id INT NOT NULL, seq INT NOT NULL DEFAULT 1,
            amount_type ENUM('amount','percent') NOT NULL,
            amount BIGINT NULL, currency_id INT NULL, percent_bp INT NULL,
            condition_text VARCHAR(500) NOT NULL DEFAULT '', due_date DATE NULL,
            status ENUM('paid','unpaid') NOT NULL DEFAULT 'unpaid', paid_at DATE NULL,
            notes TEXT NOT NULL, {_AUDIT},
            KEY idx_stages_process (process_id),
            FOREIGN KEY (process_id) REFERENCES purchase_processes(id) ON DELETE CASCADE,
            FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE RESTRICT,
            CHECK ((amount_type = 'amount' AND amount IS NOT NULL AND currency_id IS NOT NULL)
                OR (amount_type = 'percent' AND percent_bp IS NOT NULL))
        ) {_T}""",
        f"""CREATE TABLE received_guarantees (
            id INT AUTO_INCREMENT PRIMARY KEY, process_id INT NOT NULL, guarantee_type_id INT NOT NULL,
            reference_no VARCHAR(255) NOT NULL, amount BIGINT NOT NULL, currency_id INT NOT NULL,
            issue_date DATE NOT NULL, due_date DATE NULL,
            status ENUM('active','returned','collected','cancelled') NOT NULL DEFAULT 'active',
            notes TEXT NOT NULL, {_AUDIT},
            KEY idx_rg_process (process_id),
            FOREIGN KEY (process_id) REFERENCES purchase_processes(id) ON DELETE CASCADE,
            FOREIGN KEY (guarantee_type_id) REFERENCES guarantee_types(id) ON DELETE RESTRICT,
            FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE RESTRICT,
            CHECK (amount >= 0)
        ) {_T}""",
        f"""CREATE TABLE issued_guarantees (
            id INT AUTO_INCREMENT PRIMARY KEY, process_id INT NOT NULL, guarantee_type_id INT NOT NULL,
            reference_no VARCHAR(255) NOT NULL, amount BIGINT NOT NULL, currency_id INT NOT NULL,
            issue_date DATE NOT NULL, valid_until DATE NULL,
            recipient_name VARCHAR(255) NOT NULL, related_company_id INT NULL,
            status ENUM('active','returned','collected','cancelled') NOT NULL DEFAULT 'active',
            notes TEXT NOT NULL, {_AUDIT},
            KEY idx_ig_process (process_id),
            FOREIGN KEY (process_id) REFERENCES purchase_processes(id) ON DELETE CASCADE,
            FOREIGN KEY (guarantee_type_id) REFERENCES guarantee_types(id) ON DELETE RESTRICT,
            FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE RESTRICT,
            FOREIGN KEY (related_company_id) REFERENCES companies(id) ON DELETE RESTRICT,
            CHECK (amount >= 0)
        ) {_T}""",
        f"""CREATE TABLE audit_log (
            id BIGINT AUTO_INCREMENT PRIMARY KEY, process_id INT NOT NULL,
            entity VARCHAR(50) NOT NULL, entity_id INT NULL,
            action ENUM('create','update','delete') NOT NULL,
            summary VARCHAR(500) NOT NULL, changes MEDIUMTEXT NULL,
            user_name VARCHAR(255) NOT NULL, at DATETIME NOT NULL,
            KEY idx_audit_process (process_id, id)
        ) {_T}""",
        # Effective (resolved) amount of each stage; percent stages derive from proforma (or purchase) amount.
        """CREATE VIEW v_payment_stages AS
        SELECT s.id, s.process_id, s.seq, s.amount_type, s.amount, s.currency_id, s.percent_bp, s.condition_text,
               s.due_date, s.status, s.paid_at, s.notes, s.created_by, s.created_at, s.updated_by, s.updated_at,
          CASE WHEN s.amount_type = 'percent' THEN COALESCE(p.proforma_currency_id, p.purchase_currency_id) ELSE s.currency_id END AS eff_currency_id,
          CASE WHEN s.amount_type = 'percent'
               THEN CAST(ROUND(COALESCE(p.proforma_amount, p.purchase_amount, 0) * s.percent_bp / 10000) AS SIGNED)
               ELSE s.amount END AS eff_amount,
          CASE WHEN s.status = 'paid' THEN 'paid'
               WHEN s.due_date IS NOT NULL AND s.due_date < CURDATE() THEN 'overdue'
               ELSE 'unpaid' END AS eff_status
        FROM payment_stages s JOIN purchase_processes p ON p.id = s.process_id""",
    ]
]
