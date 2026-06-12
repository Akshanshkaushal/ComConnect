import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Avatar,
  Badge,
  Flex,
  useDisclosure,
  FormControl,
  Input,
  useToast,
  Box,
  Spinner,
  Text,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { ChatState } from "../../Context/ChatProvider";
import { API_URL } from "../../config/api.config";
import UserListItem from "../userAvatar/UserListItem";

const UpdateGroupChatModal = ({ fetchMessages, fetchAgain, setFetchAgain }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [groupChatName, setGroupChatName] = useState();
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renameloading, setRenameLoading] = useState(false);
  const toast = useToast();

  const { selectedChat, setSelectedChat, user } = ChatState();
  const isAdmin = selectedChat.groupAdmin?._id === user._id;

  const handleSearch = async (query) => {
    setSearch(query);
    if (!query) {
      setSearchResult([]);
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get(
        `${API_URL}/user?search=${encodeURIComponent(query)}`,
        config
      );
      setSearchResult(Array.isArray(data) ? data : []);
    } catch (error) {
      setSearchResult([]);
      toast({
        title: "Search failed",
        description:
          error.response?.data?.message || "Failed to load search results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (!groupChatName) return;

    try {
      setRenameLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.patch(
        `${API_URL}/chat/rename`,
        {
          chatId: selectedChat._id,
          chatName: groupChatName,
        },
        config
      );

      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
    } catch (error) {
      toast({
        title: "Group name could not be updated",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setRenameLoading(false);
    }
    setGroupChatName("");
  };

  const handleAddUser = async (user1) => {
    if (selectedChat.users.find((u) => u._id === user1._id)) {
      toast({
        title: "User Already in group!",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    if (selectedChat.groupAdmin?._id !== user._id) {
      toast({
        title: "Only admins can add someone!",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.patch(
        `${API_URL}/chat/groupadd`,
        {
          chatId: selectedChat._id,
          userId: user1._id,
        },
        config
      );

      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      setSearch("");
      setSearchResult([]);
    } catch (error) {
      toast({
        title: "User could not be added",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (user1) => {
    if (selectedChat.groupAdmin?._id !== user._id && user1._id !== user._id) {
      toast({
        title: "Only admins can remove someone!",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    try {
      setLoading(true);
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.patch(
        `${API_URL}/chat/groupremove`,
        {
          chatId: selectedChat._id,
          userId: user1._id,
        },
        config
      );

      user1._id === user._id ? setSelectedChat() : setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      fetchMessages();
    } catch (error) {
      toast({
        title: "User could not be removed",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMakeAdmin = async (member) => {
    try {
      setLoading(true);
      const { data } = await axios.patch(
        `${API_URL}/chat/groupadmin`,
        {
          chatId: selectedChat._id,
          userId: member._id,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        }
      );

      setSelectedChat(data);
      setFetchAgain(!fetchAgain);
      toast({
        title: `${member.name} is now the group admin`,
        status: "success",
        duration: 3500,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Admin role could not be transferred",
        description: error.response?.data?.message || error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Text
        w={"100%"}
        onClick={onOpen}
        cursor={"pointer"}
        px={3}
        lineHeight={"none"}
      >
        {selectedChat.chatName.toUpperCase()}
      </Text>

      <Modal onClose={onClose} isOpen={isOpen} isCentered>
        <ModalOverlay bg="blackAlpha.600" />
        <ModalContent bg="#171c1b" border="1px solid #313b37" color="white">
          <ModalHeader
            fontSize="20px"
            fontFamily="Work sans"
            d="flex"
            justifyContent="center"
            color="white"
          >
            Group Details
          </ModalHeader>

          <ModalCloseButton color="white" _hover={{ bg: "#21364A" }} />
          <ModalBody d="flex" flexDir="column" alignItems="stretch">
            <Text mb={4} fontSize="22px" fontWeight="700">{selectedChat.chatName}</Text>
            <Box w="100%" pb={4}>
              {selectedChat.users.map((u) => (
                <Flex
                  key={u._id}
                  align="center"
                  gap={3}
                  py={2}
                  borderBottom="1px solid #313b37"
                >
                  <Avatar size="sm" name={u.name} src={u.pic} />
                  <Box minW={0} flex="1">
                    <Text fontSize="sm" fontWeight="650" noOfLines={1}>
                      {u.name}
                    </Text>
                    <Text fontSize="xs" color="#8f9d97" noOfLines={1}>
                      {u.email}
                    </Text>
                  </Box>
                  {selectedChat.groupAdmin?._id === u._id ? (
                    <Badge bg="#214438" color="#6ee7b7">Admin</Badge>
                  ) : (
                    isAdmin && (
                      <Flex gap={2}>
                        <Button
                          size="xs"
                          variant="outline"
                          borderColor="#3a4541"
                          color="#dce6e1"
                          onClick={() => handleMakeAdmin(u)}
                        >
                          Make admin
                        </Button>
                        <Button
                          size="xs"
                          bg="#382524"
                          color="#fca5a5"
                          onClick={() => handleRemove(u)}
                        >
                          Remove
                        </Button>
                      </Flex>
                    )
                  )}
                </Flex>
              ))}
            </Box>
            {isAdmin && (
            <FormControl display="flex">
              <Input
                placeholder="Chat Name"
                mb={3}
                value={groupChatName}
                onChange={(e) => setGroupChatName(e.target.value)}
                border="1px solid #3C87CD"
                color="white"
                _placeholder={{ color: "gray.400" }}
                bg="#0F1924"
                borderColor="#2982db20"
                _hover={{ borderColor: "#2982db40" }}
                _focus={{
                  borderColor: "#21364A",
                  boxShadow: "0 0 0 1px #21364A",
                  bg: "#131f2bff",
                }}
              />
              <Button
                variant="solid"
                bg="#21364A"
                color="white"
                _hover={{ bg: "#1a2a39ff" }}
                _active={{ bg: "#1a2a39ff" }}
                ml={1}
                isLoading={renameloading}
                onClick={handleRename}
              >
                Update
              </Button>
            </FormControl>
            )}
            {isAdmin && (
            <FormControl mt={2}>
              <Input
                placeholder="Add User to group"
                mb={1}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                border="1px solid #3C87CD"
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
            )}

            {isAdmin && (loading ? (
              <Spinner size="lg" color="#3C87CD" />
            ) : (
              <Box
                maxH="200px"
                overflowY="auto"
                w="100%"
                sx={{
                  // Custom scrollbar styling
                  "&::-webkit-scrollbar": {
                    width: "2px",
                  },
                  "&::-webkit-scrollbar-track": {
                    background: "#21364A",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    background: "#3C87CD",
                    borderRadius: "4px",
                  },
                  "&::-webkit-scrollbar-thumb:hover": {
                    background: "#1f449c",
                  },
                }}
              >
                {searchResult.map((user) => (
                  <UserListItem
                    key={user._id}
                    user={user}
                    handleFunction={() => handleAddUser(user)}
                  />
                ))}
              </Box>
            ))}
            {!isAdmin && (
              <Text fontSize="sm" color="#8f9d97">
                Only the group admin can rename this channel, add members, remove
                members, or transfer admin access.
              </Text>
            )}
          </ModalBody>
          <ModalFooter bg="#0F1924">
            <Button
              onClick={() => handleRemove(user)}
              isDisabled={isAdmin}
              bg="#dc3545"
              color="white"
              _hover={{ bg: "#c82333" }}
              _active={{ bg: "#bd2130" }}
            >
              {isAdmin ? "Transfer admin before leaving" : "Leave Group"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default UpdateGroupChatModal;
