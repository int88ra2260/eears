'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. 建立 learning_partner_teams 表
      await queryInterface.createTable('learning_partner_teams', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        teamName: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: '團體名稱（選填）'
        },
        representativeStudentId: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: '代表者學號（填寫表單的學生）'
        },
        teamSize: {
          type: Sequelize.TINYINT,
          allowNull: false,
          comment: '報名人數（3~4）',
          validate: {
            min: 3,
            max: 4
          }
        },
        status: {
          type: Sequelize.ENUM('pending_approval', 'approved', 'expired', 'cancelled'),
          allowNull: false,
          defaultValue: 'pending_approval',
          comment: '團體狀態'
        },
        activeFlag: {
          type: Sequelize.TINYINT(1),
          allowNull: false,
          defaultValue: 1,
          comment: '是否為有效團體（1=有效=pending_approval/approved, 0=無效=expired/cancelled），用於 partial unique index'
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: '過期時間（createdAt + 24小時）'
        },
        approvedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: '全員同意完成的時間'
        },
        cancelledAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: '取消時間'
        },
        cancelledReason: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: '取消原因'
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }, { transaction });

      // 2. 建立 learning_partner_team_members 表
      await queryInterface.createTable('learning_partner_team_members', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        teamId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: '團體 ID',
          references: {
            model: 'learning_partner_teams',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        studentId: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: '學號'
        },
        name: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: '姓名'
        },
        email: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'Email（從個人報名記錄取得）'
        },
        isRepresentative: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: '是否為代表（填表人）'
        },
        personalRegistrationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: '對應的個人報名記錄 ID',
          references: {
            model: 'english_test_registrations',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        approvalStatus: {
          type: Sequelize.ENUM('pending', 'approved', 'expired'),
          allowNull: false,
          defaultValue: 'pending',
          comment: '同意狀態'
        },
        activeFlag: {
          type: Sequelize.TINYINT(1),
          allowNull: false,
          defaultValue: 1,
          comment: '是否為有效成員（1=有效=pending/approved, 0=無效=expired），用於 partial unique index'
        },
        approvalToken: {
          type: Sequelize.STRING(255),
          allowNull: true,
          unique: true,
          comment: '授權 token（UUID，一次性使用）'
        },
        approvalTokenExpiresAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Token 過期時間（createdAt + 24小時）'
        },
        approvedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: '同意時間'
        },
        approvalIp: {
          type: Sequelize.STRING(45),
          allowNull: true,
          comment: '同意時的 IP（IPv4 或 IPv6）'
        },
        approvalUserAgent: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: '同意時的 User-Agent'
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }, { transaction });

      // 3. 建立索引
      // learning_partner_teams 索引
      await queryInterface.addIndex('learning_partner_teams', ['status', 'createdAt'], {
        name: 'idx_status_createdAt',
        transaction
      });

      await queryInterface.addIndex('learning_partner_teams', ['expiresAt'], {
        name: 'idx_expiresAt',
        transaction
      });

      await queryInterface.addIndex('learning_partner_teams', ['representativeStudentId'], {
        name: 'idx_representativeStudentId',
        transaction
      });

      // 注意：MySQL 不支援 partial unique index，所以無法直接建立 UNIQUE(studentId) WHERE activeFlag=1
      // 我們會在應用層使用 transaction + SELECT FOR UPDATE 確保 activeFlag=1 時 studentId 的唯一性
      // 這裡只建立一般索引以提升查詢效能
      await queryInterface.addIndex('learning_partner_team_members', ['studentId', 'activeFlag'], {
        name: 'idx_studentId_activeFlag',
        transaction
      });

      // learning_partner_team_members 索引
      await queryInterface.addIndex('learning_partner_team_members', ['teamId'], {
        name: 'idx_teamId',
        transaction
      });

      await queryInterface.addIndex('learning_partner_team_members', ['approvalToken'], {
        name: 'idx_approvalToken',
        unique: true,
        transaction
      });

      await queryInterface.addIndex('learning_partner_team_members', ['personalRegistrationId'], {
        name: 'idx_personalRegistrationId',
        transaction
      });

      // 4. 注意：每人限一組的約束在應用層實現（transaction + SELECT FOR UPDATE）
      // MySQL 不支援 partial unique index，無法直接建立 UNIQUE(studentId) WHERE activeFlag=1

      await transaction.commit();
      console.log('✅ Learning Partner tables created successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating Learning Partner tables:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 刪除索引
      await queryInterface.removeIndex('learning_partner_team_members', 'idx_studentId_activeFlag_unique', { transaction });
      await queryInterface.removeIndex('learning_partner_team_members', 'idx_personalRegistrationId', { transaction });
      await queryInterface.removeIndex('learning_partner_team_members', 'idx_approvalToken', { transaction });
      await queryInterface.removeIndex('learning_partner_team_members', 'idx_teamId', { transaction });
      await queryInterface.removeIndex('learning_partner_team_members', 'idx_studentId_activeFlag', { transaction });
      await queryInterface.removeIndex('learning_partner_teams', 'idx_representativeStudentId', { transaction });
      await queryInterface.removeIndex('learning_partner_teams', 'idx_expiresAt', { transaction });
      await queryInterface.removeIndex('learning_partner_teams', 'idx_status_createdAt', { transaction });

      // 刪除表（會自動刪除外鍵約束）
      await queryInterface.dropTable('learning_partner_team_members', { transaction });
      await queryInterface.dropTable('learning_partner_teams', { transaction });

      await transaction.commit();
      console.log('✅ Learning Partner tables dropped successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error dropping Learning Partner tables:', error);
      throw error;
    }
  }
};
