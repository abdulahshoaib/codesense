process.env.NODE_ENV = "test";
process.env.PORT = "5000";
process.env.MONGODB_URI = "mongodb://localhost:27017/codesense_test";
process.env.JWT_SECRET = "test_jwt_secret_that_is_long_enough_to_pass_validation";
process.env.JWT_EXPIRES_IN = "1h";
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.LOG_LEVEL = "silent";
