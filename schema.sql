-- MySQL Schema for NEUST EPMS
-- Optimized with INT AUTO_INCREMENT IDs

CREATE DATABASE IF NOT EXISTS neust_epms;
USE neust_epms;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Roles
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 2. Campuses
CREATE TABLE campuses (
    campus_id INT AUTO_INCREMENT PRIMARY KEY,
    campus_name VARCHAR(255) NOT NULL UNIQUE,
    is_main_campus TINYINT(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB;

-- 3. Departments
CREATE TABLE departments (
    department_id INT AUTO_INCREMENT PRIMARY KEY,
    department_code VARCHAR(50) NOT NULL UNIQUE,
    department_name VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 4. Beneficiary Sectors
CREATE TABLE beneficiary_sectors (
    sector_id INT AUTO_INCREMENT PRIMARY KEY,
    sector_name VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 5. SDGs
CREATE TABLE sdgs (
    sdg_id INT AUTO_INCREMENT PRIMARY KEY,
    sdg_number INT NOT NULL UNIQUE,
    sdg_title VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

-- 6. System Settings
CREATE TABLE system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. Users
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    campus_id INT NOT NULL,
    department_id INT,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    name_suffix VARCHAR(20),
    academic_rank VARCHAR(100),
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id),
    CONSTRAINT fk_users_campus FOREIGN KEY (campus_id) REFERENCES campuses(campus_id),
    CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(department_id),
    INDEX users_role_id_idx (role_id),
    INDEX users_campus_id_idx (campus_id),
    INDEX users_department_id_idx (department_id)
) ENGINE=InnoDB;

-- 8. MOAs
CREATE TABLE moas (
    moa_id INT AUTO_INCREMENT PRIMARY KEY,
    partner_name VARCHAR(255) NOT NULL,
    partner_type VARCHAR(100) NOT NULL,
    storage_path VARCHAR(500),
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_expired TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    archived_at TIMESTAMP NULL
) ENGINE=InnoDB;

-- 9. Proposals
CREATE TABLE proposals (
    proposal_id INT AUTO_INCREMENT PRIMARY KEY,
    project_leader_id INT NOT NULL,
    campus_id INT NOT NULL,
    department_id INT NOT NULL,
    title VARCHAR(500) NOT NULL,
    banner_program VARCHAR(255) NOT NULL,
    project_locale VARCHAR(255) NOT NULL,
    extension_category VARCHAR(100) NOT NULL,
    extension_agenda VARCHAR(255) NOT NULL,
    budget_partner DECIMAL(14, 2) DEFAULT 0.00,
    budget_neust DECIMAL(14, 2) DEFAULT 0.00,
    current_status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    revision_num INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    archived_at TIMESTAMP NULL,
    CONSTRAINT fk_proposals_leader FOREIGN KEY (project_leader_id) REFERENCES users(user_id),
    CONSTRAINT fk_proposals_campus FOREIGN KEY (campus_id) REFERENCES campuses(campus_id),
    CONSTRAINT fk_proposals_department FOREIGN KEY (department_id) REFERENCES departments(department_id),
    INDEX proposals_leader_id_idx (project_leader_id),
    INDEX proposals_campus_id_idx (campus_id),
    INDEX proposals_department_id_idx (department_id),
    INDEX proposals_status_idx (current_status)
) ENGINE=InnoDB;

-- 10. Proposal Departments
CREATE TABLE proposal_departments (
    proposal_id INT NOT NULL,
    department_id INT NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (proposal_id, department_id),
    CONSTRAINT fk_pd_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id),
    CONSTRAINT fk_pd_department FOREIGN KEY (department_id) REFERENCES departments(department_id),
    INDEX proposal_departments_proposal_id_idx (proposal_id),
    INDEX proposal_departments_department_id_idx (department_id)
) ENGINE=InnoDB;

-- 11. Proposal Members
CREATE TABLE proposal_members (
    member_id INT AUTO_INCREMENT PRIMARY KEY,
    proposal_id INT NOT NULL,
    user_id INT NOT NULL,
    project_role VARCHAR(100) NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pm_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id),
    CONSTRAINT fk_pm_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX pm_proposal_id_idx (proposal_id),
    INDEX pm_user_id_idx (user_id)
) ENGINE=InnoDB;

-- 12. Proposal SDGs
CREATE TABLE proposal_sdgs (
    proposal_id INT NOT NULL,
    sdg_id INT NOT NULL,
    PRIMARY KEY (proposal_id, sdg_id),
    CONSTRAINT fk_ps_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id),
    CONSTRAINT fk_ps_sdg FOREIGN KEY (sdg_id) REFERENCES sdgs(sdg_id),
    INDEX proposal_sdgs_proposal_id_idx (proposal_id),
    INDEX proposal_sdgs_sdg_id_idx (sdg_id)
) ENGINE=InnoDB;

-- 13. Proposal Beneficiaries
CREATE TABLE proposal_beneficiaries (
    proposal_id INT NOT NULL,
    sector_id INT NOT NULL,
    PRIMARY KEY (proposal_id, sector_id),
    CONSTRAINT fk_pb_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id),
    CONSTRAINT fk_pb_sector FOREIGN KEY (sector_id) REFERENCES beneficiary_sectors(sector_id),
    INDEX proposal_beneficiaries_proposal_id_idx (proposal_id),
    INDEX proposal_beneficiaries_sector_id_idx (sector_id)
) ENGINE=InnoDB;

-- 14. Proposal Documents
CREATE TABLE proposal_documents (
    document_id INT AUTO_INCREMENT PRIMARY KEY,
    proposal_id INT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    version_num INT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pdoc_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id),
    INDEX pd_proposal_id_idx (proposal_id)
) ENGINE=InnoDB;

-- 15. Proposal Comments
CREATE TABLE proposal_comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    proposal_id INT NOT NULL,
    document_id INT NOT NULL,
    user_id INT NOT NULL,
    comment_text TEXT NOT NULL,
    annotation_json JSON NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pc_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id),
    CONSTRAINT fk_pc_document FOREIGN KEY (document_id) REFERENCES proposal_documents(document_id),
    CONSTRAINT fk_pc_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX pc_proposal_id_idx (proposal_id),
    INDEX pc_document_id_idx (document_id),
    INDEX pc_user_id_idx (user_id)
) ENGINE=InnoDB;

-- 16. Proposal Reviews
CREATE TABLE proposal_reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    proposal_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    review_stage VARCHAR(50) NOT NULL,
    decision VARCHAR(50) NOT NULL,
    comments TEXT,
    reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pr_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id),
    CONSTRAINT fk_pr_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(user_id),
    INDEX pr_proposal_id_idx (proposal_id),
    INDEX pr_reviewer_id_idx (reviewer_id)
) ENGINE=InnoDB;

-- 17. Projects
CREATE TABLE projects (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    proposal_id INT NOT NULL UNIQUE,
    moa_id INT,
    start_date TIMESTAMP NULL,
    target_end TIMESTAMP NULL,
    project_status VARCHAR(50) NOT NULL DEFAULT 'Approved',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    archived_at TIMESTAMP NULL,
    CONSTRAINT fk_projects_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(proposal_id),
    CONSTRAINT fk_projects_moa FOREIGN KEY (moa_id) REFERENCES moas(moa_id),
    INDEX projects_moa_id_idx (moa_id)
) ENGINE=InnoDB;

-- 18. Progress Reports
CREATE TABLE progress_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    submitted_by INT NOT NULL,
    storage_path VARCHAR(500),
    remarks TEXT,
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP NULL,
    CONSTRAINT fk_rep_project FOREIGN KEY (project_id) REFERENCES projects(project_id),
    CONSTRAINT fk_rep_user FOREIGN KEY (submitted_by) REFERENCES users(user_id),
    INDEX pr_project_id_idx (project_id),
    INDEX pr_submitted_by_idx (submitted_by)
) ENGINE=InnoDB;

-- 19. Special Orders
CREATE TABLE special_orders (
    special_order_id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    so_number VARCHAR(100) NOT NULL UNIQUE,
    storage_path VARCHAR(500),
    date_issued TIMESTAMP NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    archived_at TIMESTAMP NULL,
    CONSTRAINT fk_so_member FOREIGN KEY (member_id) REFERENCES proposal_members(member_id),
    INDEX so_member_id_idx (member_id)
) ENGINE=InnoDB;

-- 20. Audit Logs
CREATE TABLE audit_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    table_affected VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    INDEX al_user_id_idx (user_id),
    INDEX al_created_at_idx (created_at)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- SAMPLE DATA

INSERT INTO roles (role_name) VALUES ('Admin'), ('Project Leader'), ('Reviewer'), ('Technical Working Group');

INSERT INTO campuses (campus_name, is_main_campus) VALUES 
('Sumacab Campus', 1), 
('General Tinio Street Campus', 0),
('San Isidro Campus', 0),
('Fort Magsaysay Campus', 0),
('Atate Campus', 0);

INSERT INTO departments (department_code, department_name) VALUES 
('CICT', 'College of Information and Communications Technology'),
('COE', 'College of Engineering'),
('CAS', 'College of Arts and Sciences'),
('CCJE', 'College of Criminal Justice Education');

INSERT INTO beneficiary_sectors (sector_name) VALUES 
('Farmers'), ('Youth'), ('Senior Citizens'), ('PWD'), ('Women');

INSERT INTO sdgs (sdg_number, sdg_title) VALUES 
(1, 'No Poverty'),
(2, 'Zero Hunger'),
(3, 'Good Health and Well-being'),
(4, 'Quality Education'),
(5, 'Gender Equality'),
(17, 'Partnerships for the Goals');

INSERT INTO users (role_id, campus_id, department_id, first_name, last_name, email) VALUES 
(1, 1, 1, 'Admin', 'User', 'admin@neust.edu.ph'),
(2, 1, 1, 'John', 'Doe', 'john.doe@neust.edu.ph'),
(3, 1, 1, 'Jane', 'Reviewer', 'jane.rev@neust.edu.ph');

INSERT INTO system_settings (setting_key, setting_value) VALUES 
('app_name', 'NEUST EPMS'),
('allow_registration', 'true');

INSERT INTO proposals (project_leader_id, campus_id, department_id, title, banner_program, project_locale, extension_category, extension_agenda, current_status) VALUES 
(2, 1, 1, 'E-Learning for Remote Areas', 'Digital Literacy', 'Cabanatuan City', 'Training/Seminar', 'Education', 'Approved');

INSERT INTO proposal_documents (proposal_id, storage_path, version_num) VALUES 
(1, '/storage/proposals/p1-v1.pdf', 1);

INSERT INTO projects (proposal_id, project_status) VALUES 
(1, 'Ongoing');
