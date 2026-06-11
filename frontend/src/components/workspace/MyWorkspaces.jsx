import React from "react";
import {
  Box,
  Grid,
  Text,
  Button,
  Flex,
  Avatar,
  AvatarGroup,
  HStack,
  VStack,
} from "@chakra-ui/react";
import { useWorkspace } from "../../Context/WorkspaceProvider";
import { useNavigate } from "react-router-dom";
import { ArrowBackIcon } from "@chakra-ui/icons";

const MyWorkspaces = () => {
  const { userWorkspaces } = useWorkspace();
  const navigate = useNavigate();

  const handleSelectWorkspace = (workspace) => {
    navigate(`/workspace/${workspace._id}/chats`);
  };

  const handleBackToSelection = () => {
    navigate("/workspace");
  };

  return (
    <Flex
      minHeight="100vh"
      width="100%"
      bg="#0f1924"
      direction="column"
      p={8}
    >
      {/* Header */}
      <Flex
        mb={8}
        alignItems="center"
        justifyContent="space-between"
        maxW="1400px"
        width="100%"
        mx="auto"
      >
        <HStack spacing={4}>
          <Button
            leftIcon={<ArrowBackIcon />}
            bg="#21364A"
            color="white"
            _hover={{ bg: "#192937ff" }}
            onClick={handleBackToSelection}
          >
            Back
          </Button>
          <VStack align="start" spacing={0}>
            <Text fontSize="3xl" fontWeight="bold" color="white">
              My Workspaces
            </Text>
            <Text fontSize="md" color="gray.400">
              {userWorkspaces?.length || 0} workspace{userWorkspaces?.length !== 1 ? 's' : ''} available
            </Text>
          </VStack>
        </HStack>
      </Flex>

      {/* Workspaces Grid */}
      <Box maxW="1400px" width="100%" mx="auto">
        {Array.isArray(userWorkspaces) && userWorkspaces.length > 0 ? (
          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            }}
            gap={6}
          >
            {userWorkspaces.map((workspace) => (
              <Box
                key={workspace._id}
                bg="#0F1924"
                border="1px solid"
                borderColor="#2982db20"
                borderRadius="lg"
                p={6}
                cursor="pointer"
                onClick={() => handleSelectWorkspace(workspace)}
              >
                <VStack align="start" spacing={4} width="100%">
                  {/* Workspace Icon and Name */}
                  <HStack spacing={3} width="100%">
                    <Flex
                      bg="#21364A"
                      w="50px"
                      h="50px"
                      borderRadius="md"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <Text fontSize="2xl" fontWeight="bold" color="white">
                        {workspace.workspaceName?.charAt(0).toUpperCase() || "W"}
                      </Text>
                    </Flex>
                    <VStack align="start" spacing={0} flex={1}>
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color="white"
                        noOfLines={1}
                      >
                        {workspace.workspaceName}
                      </Text>
                      <Text fontSize="sm" color="gray.400">
                        {workspace.members?.length || 0} member{workspace.members?.length !== 1 ? 's' : ''}
                      </Text>
                    </VStack>
                  </HStack>

                  {/* Members Avatars */}
                  {workspace.members && workspace.members.length > 0 && (
                    <AvatarGroup size="sm" max={5} spacing={-2}>
                      {workspace.members.slice(0, 5).map((member, idx) => (
                        <Avatar
                          key={member._id || idx}
                          name={member.name || "User"}
                          src={member.pic}
                          bg="#21364A"
                          color="white"
                        />
                      ))}
                    </AvatarGroup>
                  )}

                  {/* Roles */}
                  {workspace.roles && workspace.roles.length > 0 && (
                    <Box width="100%">
                      <Text fontSize="xs" color="gray.500" mb={2}>
                        Roles
                      </Text>
                      <Flex flexWrap="wrap" gap={2}>
                        {workspace.roles.slice(0, 3).map((role, idx) => (
                          <Box
                            key={idx}
                            px={2}
                            py={1}
                            bg="#21364A"
                            borderRadius="md"
                            fontSize="xs"
                            color="gray.300"
                          >
                            {typeof role === 'string' ? role : role.roleName}
                          </Box>
                        ))}
                        {workspace.roles.length > 3 && (
                          <Box
                            px={2}
                            py={1}
                            bg="#21364A"
                            borderRadius="md"
                            fontSize="xs"
                            color="gray.300"
                          >
                            +{workspace.roles.length - 3} more
                          </Box>
                        )}
                      </Flex>
                    </Box>
                  )}

                  {/* Open Button */}
                  <Button
                    width="100%"
                    bg="#21364A"
                    color="white"
                    _hover={{ bg: "#192937ff" }}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectWorkspace(workspace);
                    }}
                  >
                    Open Workspace
                  </Button>
                </VStack>
              </Box>
            ))}
          </Grid>
        ) : (
          <Flex
            direction="column"
            alignItems="center"
            justifyContent="center"
            minH="50vh"
            bg="#0F1924"
            border="1px solid"
            borderColor="#2982db20"
            borderRadius="lg"
            p={12}
          >
            <Box
              bg="#21364A"
              w="80px"
              h="80px"
              borderRadius="full"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mb={4}
            >
              <Text fontSize="4xl">📁</Text>
            </Box>
            <Text fontSize="xl" fontWeight="bold" color="white" mb={2}>
              No Workspaces Yet
            </Text>
            <Text fontSize="md" color="gray.400" mb={6} textAlign="center">
              You haven't created or joined any workspaces yet.
              <br />
              Create your first workspace or join an existing one to get started!
            </Text>
            <Button
              bg="#21364A"
              color="white"
              _hover={{ bg: "#192937ff" }}
              onClick={handleBackToSelection}
            >
              Create or Join Workspace
            </Button>
          </Flex>
        )}
      </Box>
    </Flex>
  );
};

export default MyWorkspaces;
