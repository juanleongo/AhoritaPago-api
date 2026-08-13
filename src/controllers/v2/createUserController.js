const { asyncHandler } = require('../../middlewares/asyncHandler');
const {
    createUserDto,
    nicknameParamDto,
    updateUserDto
} = require('../../dtos/userDtos');
const { searchPaginationDto } = require('../../dtos/paginationDtos');
const {
    createSuccessResponse
} = require('../../dtos/output/responseDto');
const {
    userResponseDto,
    userSummaryDto
} = require('../../dtos/output/userResponseDtos');

const createUserControllerV2 = ({ userService }) => {
    const getUserById = asyncHandler(async (req, res) => {
        const user = await userService.getUserById(
            req.validated.params.id,
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: userResponseDto(user)
        }));
    });

    const getByNickname = asyncHandler(async (req, res) => {
        const { nickname } = nicknameParamDto(req.validated.params);
        const user = await userService.getByNickname(nickname);

        res.status(200).json(createSuccessResponse({
            data: userSummaryDto(user)
        }));
    });

    const getUserByToken = asyncHandler(async (req, res) => {
        const user = await userService.getUserByToken(req.user);

        res.status(200).json(createSuccessResponse({
            data: userResponseDto(user)
        }));
    });

    const searchUsers = asyncHandler(async (req, res) => {
        const { searchTerm } = req.validated.params;
        const search = await userService.searchUsersByNickname(
            searchTerm,
            searchPaginationDto(req.validated?.query)
        );

        res.status(200).json(createSuccessResponse({
            data: search.results.map(userSummaryDto),
            meta: {
                count: search.count,
                pagination: search.pagination
            }
        }));
    });

    const createUser = asyncHandler(async (req, res) => {
        const user = await userService.createUser(
            createUserDto(req.validated.body)
        );

        res.status(201).json(createSuccessResponse({
            data: userResponseDto(user),
            message: 'Usuario creado correctamente'
        }));
    });

    const updateUser = asyncHandler(async (req, res) => {
        const user = await userService.updateUser(
            req.validated.params.id,
            updateUserDto(req.validated.body),
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: userResponseDto(user),
            message: 'Usuario actualizado correctamente'
        }));
    });

    const deleteUser = asyncHandler(async (req, res) => {
        await userService.deleteUser(
            req.validated.params.id,
            req.user.userId
        );

        res.status(200).json(createSuccessResponse({
            data: null,
            message: 'Usuario eliminado correctamente'
        }));
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

module.exports = { createUserControllerV2 };
