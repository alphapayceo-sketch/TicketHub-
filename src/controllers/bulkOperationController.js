const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const emailService = require("../services/emailService");

/**
 * Bulk Operations Controller
 * Handles bulk admin operations like mass refunds, notifications
 */

exports.createBulkOperation = async (req, res) => {
  try {
    const { operationType, targetIds, reason } = req.body;
    const userId = req.user.id;

    if (!operationType || !Array.isArray(targetIds) || targetIds.length === 0) {
      return res.status(400).json({ error: "Invalid operation type or target IDs" });
    }

    const operationId = uuidv4();
    await db.query(
      `INSERT INTO bulk_operations (id, operation_type, created_by_user_id, target_count, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [operationId, operationType, userId, targetIds.length, 'PENDING']
    );

    // Process the operation asynchronously
    processBulkOperation(operationId, operationType, targetIds, userId, reason).catch(err =>
      console.error(`Error processing bulk operation ${operationId}:`, err)
    );

    res.status(201).json({
      message: "Bulk operation created",
      operationId,
      status: 'PENDING'
    });
  } catch (error) {
    console.error("Error creating bulk operation:", error);
    res.status(500).json({ error: "Failed to create bulk operation" });
  }
};

async function processBulkOperation(operationId, operationType, targetIds, userId, reason) {
  try {
    let processed = 0;

    if (operationType === 'BULK_REFUND_TICKETS') {
      for (const ticketId of targetIds) {
        try {
          // Create refund for each ticket
          const refundId = uuidv4();
          const ticketResult = await db.query(
            `SELECT user_id, event_id FROM tickets WHERE id = $1`,
            [ticketId]
          );

          if (ticketResult.rows.length > 0) {
            const { user_id, event_id } = ticketResult.rows[0];
            
            // Create refund record
            await db.query(
              `INSERT INTO refunds (id, ticket_id, user_id, reason, status)
               VALUES ($1, $2, $3, $4, $5)`,
              [refundId, ticketId, user_id, reason || 'Bulk refund by admin', 'approved']
            );

            // Update ticket status
            await db.query(
              "UPDATE tickets SET status = $1 WHERE id = $2",
              ['REFUNDED', ticketId]
            );

            processed++;
          }
        } catch (error) {
          console.error(`Error refunding ticket ${ticketId}:`, error);
        }
      }
    } else if (operationType === 'BULK_EMAIL_NOTIFICATION') {
      for (const userId of targetIds) {
        try {
          const userResult = await db.query(
            "SELECT email FROM users WHERE id = $1",
            [userId]
          );

          if (userResult.rows.length > 0) {
            await emailService.sendBulkOperationNotification(userResult.rows[0].email, {
              operationType,
              targetCount: targetIds.length,
              processedCount: processed + 1,
              status: 'PROCESSING',
              completedAt: new Date().toISOString()
            });
            processed++;
          }
        } catch (error) {
          console.error(`Error sending email to user ${userId}:`, error);
        }
      }
    } else if (operationType === 'BULK_CANCEL_EVENTS') {
      for (const eventId of targetIds) {
        try {
          await db.query(
            "UPDATE events SET status = $1 WHERE id = $2",
            ['CANCELLED', eventId]
          );
          processed++;
        } catch (error) {
          console.error(`Error cancelling event ${eventId}:`, error);
        }
      }
    } else if (operationType === 'BULK_BLOCK_USERS') {
      for (const blockUserId of targetIds) {
        try {
          // Update user role to indicate blocking
          await db.query(
            "UPDATE users SET role = $1 WHERE id = $2",
            ['BLOCKED', blockUserId]
          );
          processed++;
        } catch (error) {
          console.error(`Error blocking user ${blockUserId}:`, error);
        }
      }
    }

    // Update operation status
    await db.query(
      `UPDATE bulk_operations 
       SET status = $1, processed_count = $2, completed_at = NOW()
       WHERE id = $3`,
      ['COMPLETED', processed, operationId]
    );

  } catch (error) {
    console.error("Error in processBulkOperation:", error);
    await db.query(
      `UPDATE bulk_operations SET status = $1 WHERE id = $2`,
      ['FAILED', operationId]
    );
  }
}

exports.getBulkOperation = async (req, res) => {
  try {
    const { operationId } = req.params;

    const result = await db.query(
      `SELECT 
        id,
        operation_type,
        target_count,
        processed_count,
        status,
        created_at,
        completed_at,
        u.fullname as created_by
       FROM bulk_operations b
       JOIN users u ON b.created_by_user_id = u.id
       WHERE b.id = $1`,
      [operationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Operation not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching bulk operation:", error);
    res.status(500).json({ error: "Failed to fetch operation" });
  }
};

exports.getBulkOperations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, operationType } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT 
      id,
      operation_type,
      target_count,
      processed_count,
      status,
      created_at,
      completed_at,
      u.fullname as created_by
     FROM bulk_operations b
     JOIN users u ON b.created_by_user_id = u.id
     WHERE 1=1`;

    const params = [];

    if (status) {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }

    if (operationType) {
      params.push(operationType);
      query += ` AND b.operation_type = $${params.length}`;
    }

    query += ` ORDER BY b.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const result = await db.query(query, params);

    // Get count
    const countQuery = `SELECT COUNT(*) as total FROM bulk_operations WHERE 1=1`;
    const countParams = [];
    
    let countQueryFinal = countQuery;
    if (status) {
      countParams.push(status);
      countQueryFinal += ` AND status = $${countParams.length}`;
    }
    if (operationType) {
      countParams.push(operationType);
      countQueryFinal += ` AND operation_type = $${countParams.length}`;
    }

    const countResult = await db.query(countQueryFinal, countParams);

    res.json({
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total)
      },
      operations: result.rows
    });
  } catch (error) {
    console.error("Error fetching bulk operations:", error);
    res.status(500).json({ error: "Failed to fetch operations" });
  }
};

exports.cancelBulkOperation = async (req, res) => {
  try {
    const { operationId } = req.params;

    const opResult = await db.query(
      "SELECT status FROM bulk_operations WHERE id = $1",
      [operationId]
    );

    if (opResult.rows.length === 0) {
      return res.status(404).json({ error: "Operation not found" });
    }

    if (opResult.rows[0].status !== 'PENDING') {
      return res.status(400).json({ error: "Can only cancel pending operations" });
    }

    await db.query(
      "UPDATE bulk_operations SET status = $1 WHERE id = $2",
      ['CANCELLED', operationId]
    );

    res.json({ message: "Operation cancelled" });
  } catch (error) {
    console.error("Error cancelling bulk operation:", error);
    res.status(500).json({ error: "Failed to cancel operation" });
  }
};

exports.getBulkOperationStats = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        operation_type,
        COUNT(*) as total_operations,
        SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        SUM(target_count) as total_targets,
        SUM(processed_count) as total_processed
       FROM bulk_operations
       GROUP BY operation_type`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching bulk operation stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
