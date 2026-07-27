const userService = require('../services/userService');
const { asyncHandler } = require('../middlewares/asyncHandler');

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
});

const getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(
        req.params.id,
        req.user.userId
    );

    res.status(200).json(user);
});

const getByNickname = asyncHandler(async (req, res) => {
    const user = await userService.getByNickname(req.body.nick);
    res.status(200).json(user);
});

const getUserByToken = asyncHandler(async (req, res) => {
    const user = await userService.getUserByToken(req.user);
    res.status(200).json(user);
});

const searchUsers = asyncHandler(async (req, res) => {
    const { searchTerm } = req.params;
    const users = await userService.searchUsersByNickname(searchTerm);

    res.status(200).json({
        msg: `Resultados de la búsqueda para '${searchTerm}'`,
        results: users
    });
});

const createUser = asyncHandler(async (req, res) => {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
});

const updateUser = asyncHandler(async (req, res) => {
    const updatedUser = await userService.updateUser(
        req.params.id,
        req.body,
        req.user.userId
    );

    res.status(200).json(updatedUser);
});

const deleteUser = asyncHandler(async (req, res) => {
    await userService.deleteUser(req.params.id, req.user.userId);
    res.status(200).json({ message: 'Usuario eliminado correctamente' });
});

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getByNickname,
    getUserByToken,
    searchUsers
};
