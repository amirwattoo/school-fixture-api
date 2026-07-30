import { sendSuccess } from "../../common/response.js";
import { createUserSchema, updateUserSchema, userIdParamsSchema, } from "./users.schemas.js";
import { usersService } from "./users.service.js";
export const listUsers = async (request, response) => {
    sendSuccess(response, { users: await usersService.list(request.auth.schoolId) }, "Users retrieved");
};
export const createUser = async (request, response) => {
    const input = createUserSchema.parse(request.body);
    const user = await usersService.create({
        userId: request.auth.userId,
        schoolId: request.auth.schoolId,
    }, input);
    sendSuccess(response, { user }, "User created", 201);
};
export const updateUser = async (request, response) => {
    const { userId } = userIdParamsSchema.parse(request.params);
    const input = updateUserSchema.parse(request.body);
    const user = await usersService.update({
        userId: request.auth.userId,
        schoolId: request.auth.schoolId,
    }, userId, input);
    sendSuccess(response, { user }, "User updated");
};
//# sourceMappingURL=users.controller.js.map