/**
 * Pagination utility functions
 */

/**
 * Calculate pagination details
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata
 */
function getPaginationMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null
  };
}

/**
 * Calculate SQL offset from page and limit
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {number} SQL OFFSET value
 */
function getOffset(page, limit) {
  return (page - 1) * limit;
}

/**
 * Validate and sanitize pagination parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Validated page and limit
 */
function validatePaginationParams(query) {
  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || 10;

  // Ensure page is at least 1
  page = Math.max(1, page);

  // Limit range: 1-100
  limit = Math.max(1, Math.min(100, limit));

  return { page, limit };
}

module.exports = {
  getPaginationMeta,
  getOffset,
  validatePaginationParams
};
