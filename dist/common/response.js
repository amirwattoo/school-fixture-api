export const sendSuccess = (response, data, message, statusCode = 200) => {
    response.status(statusCode).json({
        success: true,
        data,
        message,
    });
};
//# sourceMappingURL=response.js.map