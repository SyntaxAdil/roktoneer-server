// import validateToken from "../utils/validateToken.js";

import validateToken from "../utils/verifyToken.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - No token provided",
      });
    }
    const token = authHeader.split(" ")[1];
    const payload = await validateToken(token);

    
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - Invalid token",
    });
  }
};

export default authMiddleware;