const { asyncHandler } = require('../../middlewares/asyncHandler');
const {
    createUserDto,
    nicknameLookupDto,
    updateUserDto
} = require('../../dtos/userDtos');
const { searchPaginationDto } = require('../../dtos/paginationDtos');

const createUserController = ({ userService }) => {
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
        const search = await userService.searchUsersByNickname(
            searchTerm,
            searchPaginationDto(req.validated?.query)
        );

        res.status(200).json({
            msg: `Resultados de la búsqueda para '${searchTerm}'`,
            ...search
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
        res.status(200).json({
            message: 'Usuario eliminado correctamente'
        });
    });

    return {
        createUser,
        deleteUser,
        getByNickname,
        getUserById,
        getUserByToken,
        searchUsers,
        updateUser
    };
};

module.exports = { createUserController };
