export const health = (req, res) => {
  res.status(200).json({ 
    status: "OK",
    message: "Service is healthy",
    timestamp: new Date().toISOString()
  });
}; 