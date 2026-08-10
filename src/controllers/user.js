const userService = require('../services/userService');
const { asyncHandler } = require('../middlewares/asyncHandler');
const {
    createUserDto,
    nicknameLookupDto,
    updateUserDto
} = require('../dtos/userDtos');

const getAllUsers = asyncHandler(async (req, res) => {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
});

const getUserById = asyncHandler(async (req, res) => {
    const user = await userService.getUserById(
        req.validated.params.id,
        req.user.userId
    );

    res.status(200).json(user);
});

const getByNickname = asyncHandler(async (req, res) => {
    const { nick } = nicknameLookupDto(req.validated.body);
    const user = await userService.getByNickname(nick);
    res.status(200).json(user);
});

const getUserByToken = asyncHandler(async (req, res) => {
    const user = await userService.getUserByToken(req.user);
    res.status(200).json(user);
});

const searchUsers = asyncHandler(async (req, res) => {
    const { searchTerm } = req.validated.params;
    const users = await userService.searchUsersByNickname(searchTerm);

    res.status(200).json({
        msg: `Resultados de la búsqueda para '${searchTerm}'`,
        results: users
    });
});

const createUser = asyncHandler(async (req, res) => {
    const userData = createUserDto(req.validated.body);
    const newUser = await userService.createUser(userData);
    res.status(201).json(newUser);
});

const updateUser = asyncHandler(async (req, res) => {
    const updatedUser = await userService.updateUser(
        req.validated.params.id,
        updateUserDto(req.validated.body),
        req.user.userId
    );

    res.status(200).json(updatedUser);
});

const deleteUser = asyncHandler(async (req, res) => {
    await userService.deleteUser(
        req.validated.params.id,
        req.user.userId
    );
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
