import React, { useCallback, useState, useEffect } from "react";
import axios from "axios";
import emailjs from "emailjs-com";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Button,
  Stack,
  Box,
  List,
  ListItem,
  Tag,
  TagLabel,
  TagCloseButton,
  HStack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useWorkspace } from "../../Context/WorkspaceProvider";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../config/api.config";

const CreateWorkspaceModal = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState("");
  const [roles, setRoles] = useState([]);
  const [roleInput, setRoleInput] = useState("");
  const [roleList, setRoleList] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [emails, setEmails] = useState("");
  const { user } = useWorkspace();
  const [workspaceId, setWorkspaceId] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const token =
    user?.token || JSON.parse(localStorage.getItem("userInfo"))?.token;

  const createWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast({
        title: "Workspace name is required",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (roles.length === 0) {
      toast({
        title: "Please add at least one role",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/workspace`,
        { name: workspaceName, roles },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Workspace created:", response.data);
      setWorkspaceId(response.data.workspace._id);
      toast({
        title: "Workspace Created",
        description: "Your workspace has been successfully created.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setStep(2);
    } catch (error) {
      console.error("Error creating workspace:", error);
      toast({
        title: "Error creating workspace",
        description: error.response?.data?.message || "Failed to create workspace",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const fetchRoles = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/workspace/${workspaceId}/roles`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRoleList(response.data);
    } catch (error) {
      console.error("Error fetching roles:", error);
    }
  }, [token, workspaceId]);

  const sendInvitation = (email, role) => {
    const templateParams = {
      to_email: email,
      workspace_id: workspaceId,
      workspace_name: workspaceName,
      role_name: role,
      portal_link: "http://your-portal-link.com",
    };

    emailjs
      .send(
        process.env.REACT_APP_EMAILJS_SERVICE_ID,
        process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
        templateParams,
        process.env.REACT_APP_EMAILJS_USER_ID
      )
      .then(
        (result) => {
          console.log("Email sent:", result.text);
        },
        (error) => {
          console.error("Error sending email:", error.text);
        }
      );
  };

  const inviteUsers = () => {
    if (!emails.trim()) {
      toast({
        title: "Please enter at least one email",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const emailsArray = emails.split(",").map((email) => email.trim());
    emailsArray.forEach((email) => sendInvitation(email, selectedRole));
    
    toast({
      title: "Invitations Sent",
      description: `Sent ${emailsArray.length} invitation(s)`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    
    setEmails("");
    setSelectedRole(null);
  };

  const handleAddRole = () => {
    if (roleInput.trim() && !roles.includes(roleInput.trim())) {
      setRoles([...roles, roleInput.trim()]);
      setRoleInput("");
    }
  };

  const handleRemoveRole = (roleToRemove) => {
    setRoles(roles.filter(role => role !== roleToRemove));
  };

  useEffect(() => {
    if (step === 2 && workspaceId) {
      fetchRoles();
    }
  }, [step, workspaceId, fetchRoles]);

  const handleDone = () => {
    setIsOpen(false);
    if (workspaceId) {
      navigate(`/workspace/${workspaceId}/chats`);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setStep(1);
    setWorkspaceName("");
    setRoles([]);
    setRoleInput("");
    setSelectedRole(null);
    setEmails("");
    setWorkspaceId(null);
  };

  const handleModalClose = () => {
    setIsOpen(false);
    setStep(1);
  };

  return (
    <>
      <Button
        bg="#21364A"
        color="white"
        alignItems="center"
        justifyContent="center"
        rounded={10}
        onClick={handleOpen}
        _hover={{ bg: "#192937ff" }}
      >
        Create Workspace
      </Button>

      <Modal size="lg" isOpen={isOpen} onClose={handleModalClose} isCentered>
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent
          pb={4}
          pt={1}
          bg="#0F1924"
          color="white"
          border="1px solid"
          borderColor="#2982db20"
        >
          <ModalHeader color="white">
            {step === 1 ? "Create Workspace" : "Invite Users"}
          </ModalHeader>
          <ModalCloseButton color="white" _hover={{ bg: "#21364A" }} />
          <ModalBody>
            {step === 1 && (
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel color="gray.300">Workspace Name</FormLabel>
                  <Input
                    placeholder="Enter workspace name"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    bg="#0F1924"
                    borderColor="#2982db20"
                    color="white"
                    _placeholder={{ color: "gray.400" }}
                    _hover={{ borderColor: "#2982db40" }}
                    _focus={{
                      borderColor: "#21364A",
                      boxShadow: "0 0 0 1px #21364A",
                      bg: "#131f2bff",
                    }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.300">Add Roles</FormLabel>
                  <HStack>
                    <Input
                      placeholder="Enter role name"
                      value={roleInput}
                      onChange={(e) => setRoleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddRole();
                        }
                      }}
                      bg="#0F1924"
                      borderColor="#2982db20"
                      color="white"
                      _placeholder={{ color: "gray.400" }}
                      _hover={{ borderColor: "#2982db40" }}
                      _focus={{
                        borderColor: "#21364A",
                        boxShadow: "0 0 0 1px #21364A",
                        bg: "#131f2bff",
                      }}
                    />
                    <Button
                      onClick={handleAddRole}
                      bg="#21364A"
                      color="white"
                      _hover={{ bg: "#192937ff" }}
                      flexShrink={0}
                    >
                      Add
                    </Button>
                  </HStack>
                </FormControl>

                {roles.length > 0 && (
                  <Box>
                    <FormLabel color="gray.300" mb={2}>Roles Added</FormLabel>
                    <HStack spacing={2} flexWrap="wrap">
                      {roles.map((role, index) => (
                        <Tag
                          key={index}
                          size="md"
                          bg="#21364A"
                          color="white"
                          borderRadius="full"
                        >
                          <TagLabel>{role}</TagLabel>
                          <TagCloseButton onClick={() => handleRemoveRole(role)} />
                        </Tag>
                      ))}
                    </HStack>
                  </Box>
                )}

                <Button
                  bg="#21364A"
                  color="white"
                  _hover={{ bg: "#192937ff" }}
                  _active={{ bg: "#192937ff" }}
                  onClick={createWorkspace}
                  mt={4}
                >
                  Create & Continue
                </Button>
              </Stack>
            )}

            {step === 2 && (
              <Stack spacing={4}>
                <Box>
                  <FormLabel color="gray.300" mb={3}>Select Role to Invite Users</FormLabel>
                  <List spacing={2}>
                    {roleList.map((role, index) => (
                      <ListItem
                        key={index}
                        p={3}
                        cursor="pointer"
                        bg={selectedRole === role.roleName ? "#21364A" : "#0F1924"}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="#2982db20"
                        _hover={{ bg: "#21364A" }}
                        onClick={() => setSelectedRole(role.roleName)}
                      >
                        <Text color="white">{role.roleName}</Text>
                      </ListItem>
                    ))}
                  </List>
                </Box>

                {selectedRole && (
                  <Box
                    p={4}
                    bg="#0F1924"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="#2982db20"
                  >
                    <FormControl>
                      <FormLabel color="gray.300">
                        Invite Users to {selectedRole}
                      </FormLabel>
                      <Input
                        placeholder="Enter emails separated by commas"
                        value={emails}
                        onChange={(e) => setEmails(e.target.value)}
                        bg="#0F1924"
                        borderColor="#2982db20"
                        color="white"
                        _placeholder={{ color: "gray.400" }}
                        _hover={{ borderColor: "#2982db40" }}
                        _focus={{
                          borderColor: "#21364A",
                          boxShadow: "0 0 0 1px #21364A",
                          bg: "#131f2bff",
                        }}
                      />
                      <Button
                        mt={3}
                        bg="#21364A"
                        color="white"
                        _hover={{ bg: "#192937ff" }}
                        onClick={inviteUsers}
                      >
                        Send Invitations
                      </Button>
                    </FormControl>
                  </Box>
                )}

                <Button
                  bg="#21364A"
                  color="white"
                  _hover={{ bg: "#192937ff" }}
                  _active={{ bg: "#192937ff" }}
                  onClick={handleDone}
                  mt={4}
                >
                  Done
                </Button>
              </Stack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CreateWorkspaceModal;
