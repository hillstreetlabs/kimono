const Migrations = artifacts.require("Migrations");

module.exports = function(deployer, _, accounts) {
  deployer.deploy(Migrations);
};
