'use strict';
module.exports = (sequelize, DataTypes) => {
  const channel = sequelize.define('channel', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false
    },
    rules: DataTypes.JSON,
    game: DataTypes.JSON
  }, {});

  channel.associate = function (models) {
    // associations can be defined here
  };
  return channel;
};