'use strict';

// The userdata bucket is no longer public: its files are served through CloudFront.
// Points every stored file URL at the CloudFront domain instead of the S3 bucket.
const S3_BASE = 'https://supercloud-userdata.s3.us-east-2.amazonaws.com/';
const CDN_BASE = 'https://media.supercloud.nickesqueda.com/';

const URL_COLUMNS = {
  Users: ['profileImageURL', 'bannerImageURL'],
  Songs: ['songURL', 'artworkURL'],
};

// Swaps the `from` prefix for `to` (only at the start of the URL, so nothing else in it is touched)
const replaceBaseURL = (queryInterface, from, to) =>
  queryInterface.sequelize.transaction(async transaction => {
    for (const [table, columns] of Object.entries(URL_COLUMNS)) {
      for (const column of columns) {
        await queryInterface.sequelize.query(
          `UPDATE "${table}" SET "${column}" = :to || substring("${column}" from :rest)
           WHERE left("${column}", :len) = :from`,
          { replacements: { from, to, len: from.length, rest: from.length + 1 }, transaction }
        );
      }
    }
  });

module.exports = {
  up: (queryInterface) => replaceBaseURL(queryInterface, S3_BASE, CDN_BASE),
  down: (queryInterface) => replaceBaseURL(queryInterface, CDN_BASE, S3_BASE),
};
