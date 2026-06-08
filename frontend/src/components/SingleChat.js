import { FormControl } from "@chakra-ui/form-control";
import { Input } from "@chakra-ui/input";
import { Box, Text, Circle } from "@chakra-ui/layout";
import "./styles.css";
import { Avatar } from "@chakra-ui/avatar";
import {
  Button,
  IconButton,
  Spinner,
  useToast,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
} from "@chakra-ui/react";
import { getSender, getSenderFull } from "../config/ChatLogics";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { ArrowBackIcon } from "@chakra-ui/icons";
import ProfileModal from "./miscellaneous/ProfileModal";
import ScrollableChat from "./ScrollableChat";
import "./styles.css";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import { ChatState } from "../Context/ChatProvider";
import TaskDialog from "./task_allocator/TaskDialog";
import { useDisclosure } from "@chakra-ui/react";
import { API_URL } from "../config/api.config";
import UserListItem from "./userAvatar/UserListItem";
import socket from "../Context/SocketContext";
import ChatSummaryButton from "./ai/ChatSummaryButton";

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [istyping, setIsTyping] = useState(false);
  const [pendingMessages, setPendingMessages] = useState([]);

  // Use ref to track the currently selected chat for socket listeners
  const selectedChatCompareRef = useRef();

  // Search functionality states
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isSearchOpen,
    onOpen: onSearchOpen,
    onClose: onSearchClose,
  } = useDisclosure();

  const {
    selectedChat,
    setSelectedChat,
    user,
    notification,
    setNotification,
    chats,
    setChats,
  } = ChatState();

  const fetchMessages = async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      const { data } = await axios.get(
        `${API_URL}/message/${selectedChat._id}`,
        config
      );
      setMessages(data);
      setLoading(false);

      console.log("Joining chat room:", selectedChat._id);
      console.log("Socket connected:", socket.connected);
      socket.emit("join chat", selectedChat._id);
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: "Failed to Load the Messages",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const token = user.token;
  console.log(token);

  // Search functionality
  const handleSearch = async () => {
    if (!search.trim()) {
      setSearchResult([]);
      return;
    }

    try {
      setSearchLoading(true);

      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.get(
        `${API_URL}/user?search=${search}`,
        config
      );
      console.log("search", data);

      setSearchLoading(false);
      setSearchResult(data);
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: "Failed to Load the Search Results",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      setSearchLoading(false);
    }
  };

  // Auto-search when user types
  useEffect(() => {
    if (search && isSearchOpen) {
      const debounceTimer = setTimeout(() => {
        handleSearch();
      }, 300); // Debounce for 300ms

      return () => clearTimeout(debounceTimer);
    } else if (!search) {
      setSearchResult([]);
    }
  }, [search, isSearchOpen]);

  const accessChat = async (userId) => {
    console.log(userId);

    try {
      setLoadingChat(true);
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };

      // Include workspaceId in the request body if available
      const requestBody = { userId };
      if (selectedChat?.workspace) {
        requestBody.workspaceId = selectedChat.workspace;
      }

      const { data } = await axios.post(`${API_URL}/chat`, requestBody, config);

      if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
      setSelectedChat(data);
      setLoadingChat(false);
      onSearchClose();
    } catch (error) {
      toast({
        title: "Error fetching the chat",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
      setLoadingChat(false);
    }
  };

  const sendMessage = async (event) => {
    // Check if it's an Enter key press or a direct call (button click)
    const shouldSend = !event || event.key === "Enter";

    if (shouldSend && newMessage) {
      console.log("Sending message:", newMessage);
      console.log("Socket connected:", socket.connected);

      const messageContent = newMessage;
      const tempId = `temp-${Date.now()}`;

      // Create a pending message for optimistic UI
      const pendingMessage = {
        _id: tempId,
        content: messageContent,
        sender: {
          _id: user._id,
          name: user.name,
          pic: user.pic,
        },
        chat: selectedChat,
        isPending: true,
        createdAt: new Date().toISOString(),
      };

      socket.emit("stop typing", selectedChat._id);

      // Clear input and add pending message immediately for instant feedback
      setNewMessage("");
      setPendingMessages((prev) => [...prev, pendingMessage]);

      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };

        const { data } = await axios.post(
          `${API_URL}/message`,
          {
            content: messageContent,
            chatId: selectedChat._id,
          },
          config
        );

        console.log("💾 Message saved to DB:", data);
        console.log('📤 Emitting "new message" event to socket');
        console.log("👥 Chat users:", data.chat?.users);

        // Remove pending message and add real message
        setPendingMessages((prev) => prev.filter((msg) => msg._id !== tempId));
        setMessages((prevMessages) => {
          // Avoid duplicates - check if message already exists
          if (!prevMessages.some((msg) => msg._id === data._id)) {
            return [...prevMessages, data];
          }
          return prevMessages;
        });

        socket.emit("new message", data);
      } catch (error) {
        console.error("Error sending message:", error);
        // Remove pending message and restore message in input on error
        setPendingMessages((prev) => prev.filter((msg) => msg._id !== tempId));
        setNewMessage(messageContent);
        toast({
          title: "Error Occurred!",
          description: "Failed to send the Message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    }
  };

  useEffect(() => {
    // Connect socket if not already connected
    if (!socket.connected) {
      console.log("Connecting socket...");
      socket.connect();
    }

    socket.emit("setup", user);

    const handleConnected = () => {
      console.log("Socket connected successfully");
      setSocketConnected(true);
    };

    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    socket.on("connected", handleConnected);
    socket.on("typing", handleTyping);
    socket.on("stop typing", handleStopTyping);

    // Cleanup on unmount
    return () => {
      socket.off("connected", handleConnected);
      socket.off("typing", handleTyping);
      socket.off("stop typing", handleStopTyping);
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchMessages();

    // Update the ref when selectedChat changes
    selectedChatCompareRef.current = selectedChat;
    // eslint-disable-next-line
  }, [selectedChat]);

  useEffect(() => {
    const handleMessageReceived = (newMessageRecieved) => {
      console.log("📨 Message received from socket:", newMessageRecieved);
      console.log("📋 Current selected chat:", selectedChatCompareRef.current);

      if (
        !selectedChatCompareRef.current ||
        selectedChatCompareRef.current._id !== newMessageRecieved.chat._id
      ) {
        // Message is for a different chat - add to notifications
        console.log(
          "🔔 Message is for different chat - adding to notifications"
        );
        setNotification((prevNotifications) => {
          if (
            !prevNotifications.some(
              (notif) => notif._id === newMessageRecieved._id
            )
          ) {
            return [newMessageRecieved, ...prevNotifications];
          }
          return prevNotifications;
        });
        setFetchAgain((prev) => !prev);
      } else {
        // Message is for current chat - display it immediately
        console.log("✅ Message is for current chat - displaying in real-time");
        setMessages((prevMessages) => {
          // Avoid duplicates - check if message already exists
          if (!prevMessages.some((msg) => msg._id === newMessageRecieved._id)) {
            return [...prevMessages, newMessageRecieved];
          }
          return prevMessages;
        });
      }
    };

    // Register the socket listener
    socket.on("message recieved", handleMessageReceived);
    console.log('🎧 Socket listener registered for "message recieved"');

    // Clean up the event listener when dependencies change or component unmounts
    return () => {
      socket.off("message recieved", handleMessageReceived);
      console.log('🔇 Socket listener removed for "message recieved"');
    };
  }, []); // Empty dependency array since we're using functional updates

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isSearchOpen &&
        !event.target.closest(".search-dropdown") &&
        !event.target.closest("input")
      ) {
        onSearchClose();
        setSearch("");
        setSearchResult([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchOpen, onSearchClose]);

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (e.target.value === "/task") {
      onOpen();
      setNewMessage("");
    }

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  const logoutHandler = () => {
    localStorage.removeItem("userInfo");
    window.location.href = "/";
  };

  return (
    <Box display="flex" height="100vh" w="100%">
      {/* Chat area fills remaining space */}
      <Box flex={1} height="100vh">
        {selectedChat ? (
          <Box d="flex" flexDir="column" bg="#0f1924" w="100%" height="100vh">
            <Box
              bg="#0b1219ff"
              display="flex"
              flexDirection="row"
              alignItems={"center"}
              width="100%"
              px={3}
              py={3}
              gap={3}
            >
              <IconButton
                d={{ base: "flex", md: "none" }}
                bg={"#21364A"}
                borderRadius={"12px"}
                _hover={{ bg: "#2982db20" }}
                icon={<ArrowBackIcon color="white" />}
                onClick={() => setSelectedChat("")}
                flexShrink={0}
              />
              <Box
                flex="1"
                display="flex"
                alignItems="center"
                color="#fff"
                fontSize={{ base: "28px", md: "30px" }}
                fontFamily="Work sans"
              >
                {messages &&
                  (!selectedChat.isGroupChat ? (
                    <ProfileModal
                      user={getSenderFull(user, selectedChat.users)}
                    >
                      <Box width="100%" cursor="pointer">
                        {getSender(user, selectedChat.users)}
                      </Box>
                    </ProfileModal>
                  ) : (
                    <UpdateGroupChatModal
                      fetchMessages={fetchMessages}
                      fetchAgain={fetchAgain}
                      setFetchAgain={setFetchAgain}
                    >
                      <Box width="100%" cursor="pointer">
                        {selectedChat.chatName}
                      </Box>
                    </UpdateGroupChatModal>
                  ))}
              </Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap={3}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  {selectedChat.isGroupChat && (
                    <ChatSummaryButton chatId={selectedChat._id} />
                  )}
                  <Box position="relative">
                    {/* Search Button/Input - Expands when clicked */}
                    <Box
                      display="flex"
                      alignItems="center"
                      bg={"#21364A"}
                      borderRadius={"12px"}
                      _hover={{ bg: "#2982db20" }}
                      transition="all 0.2s ease-in-out"
                      width={isSearchOpen ? "300px" : "auto"}
                      p={isSearchOpen ? "0px 0px" : "0"}
                      pr={isSearchOpen ? 2 : 0}
                    >
                      {!isSearchOpen ? (
                        <Button
                          p={0}
                          bg="transparent"
                          _hover={{ bg: "transparent" }}
                          onClick={onSearchOpen}
                          title="Search Users to chat"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M16.9422 16.0578L13.0305 12.1469C15.3858 9.3192 15.1004 5.13911 12.3826 2.65779C9.66485 0.176469 5.47612 0.271665 2.87389 2.87389C0.271665 5.47612 0.176469 9.66485 2.65779 12.3826C5.13911 15.1004 9.3192 15.3858 12.1469 13.0305L16.0578 16.9422C16.302 17.1864 16.698 17.1864 16.9422 16.9422C17.1864 16.698 17.1864 16.302 16.9422 16.0578ZM2.125 7.75C2.125 4.6434 4.6434 2.125 7.75 2.125C10.8566 2.125 13.375 4.6434 13.375 7.75C13.375 10.8566 10.8566 13.375 7.75 13.375C4.64483 13.3716 2.12844 10.8552 2.125 7.75Z"
                              fill="white"
                            />
                          </svg>
                        </Button>
                      ) : (
                        <Box
                          display="flex"
                          alignItems="center"
                          width="100%"
                          gap={2}
                        >
                          <Input
                            placeholder="Search by name or email"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSearch();
                              }
                              if (e.key === "Escape") {
                                onSearchClose();
                              }
                            }}
                            bg="transparent"
                            border="none"
                            color="white"
                            _placeholder={{ color: "gray.300" }}
                            _focus={{ outline: "none", boxShadow: "none" }}
                            autoFocus
                            fontSize="sm"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                          />
                          <Button
                            size="xs"
                            bg="transparent"
                            color="white"
                            _hover={{ bg: "whiteAlpha.200" }}
                            onClick={onSearchClose}
                            minW="auto"
                            p={1}
                          >
                            ✕
                          </Button>
                        </Box>
                      )}
                    </Box>

                    {/* Search Results Dropdown */}
                    {isSearchOpen &&
                      (search || searchResult.length > 0 || searchLoading) && (
                        <Box
                          className="search-dropdown"
                          position="absolute"
                          top="calc(100% + 8px)"
                          right="0"
                          left="0"
                          bg="#0F1924"
                          boxShadow="lg"
                          borderRadius="md"
                          zIndex="1000"
                          border="1px solid"
                          borderColor="#2982db20"
                          maxH="250px"
                          overflowY="auto"
                          p={2}
                          sx={{
                            animation: "slideDown 0.2s ease-out",
                          }}
                        >
                          {searchLoading ? (
                            <Box textAlign="center" py={4}>
                              <Spinner size="sm" color="white" />
                              <Text fontSize="sm" color="gray.300" mt={2}>
                                Searching...
                              </Text>
                            </Box>
                          ) : (
                            <>
                              {searchResult?.length > 0
                                ? searchResult.map((user) => (
                                    <UserListItem
                                      key={user._id}
                                      user={user}
                                      handleFunction={() =>
                                        accessChat(user._id)
                                      }
                                    />
                                  ))
                                : search &&
                                  !searchLoading && (
                                    <Box textAlign="center" py={4}>
                                      <Text color="gray.300" fontSize="sm">
                                        No users found for "{search}"
                                      </Text>
                                    </Box>
                                  )}
                            </>
                          )}
                          {loadingChat && (
                            <Box
                              textAlign="center"
                              py={2}
                              borderTop="1px solid"
                              borderColor="#2982db20"
                            >
                              <Spinner size="sm" color="white" />
                              <Text fontSize="sm" color="gray.300" mt={1}>
                                Opening chat...
                              </Text>
                            </Box>
                          )}
                        </Box>
                      )}
                  </Box>

                  <Button
                    p={3}
                    bg={"#21364A"}
                    borderRadius={"12px"}
                    onClick={onOpen}
                    _hover={{ bg: "#2982db20" }}
                    title="Allocate New Task"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8 1C8.27614 1 8.5 1.22386 8.5 1.5V7.5H14.5C14.7761 7.5 15 7.72386 15 8C15 8.27614 14.7761 8.5 14.5 8.5H8.5V14.5C8.5 14.7761 8.27614 15 8 15C7.72386 15 7.5 14.7761 7.5 14.5V8.5H1.5C1.22386 8.5 1 8.27614 1 8C1 7.72386 1.22386 7.5 1.5 7.5H7.5V1.5C7.5 1.22386 7.72386 1 8 1Z"
                        fill="white"
                      />
                    </svg>
                  </Button>

                  <Menu>
                    <MenuButton
                      p={3}
                      borderRadius="12px"
                      display="flex"
                      alignItems="center"
                      alignContent={"center"}
                      bg={"#21364A"}
                      title="Notifications"
                      _hover={{ bg: "#2982db20" }}
                    >
                      <Box>
                        <svg
                          width="16"
                          height="18"
                          viewBox="0 0 16 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fill-rule="evenodd"
                            clip-rule="evenodd"
                            d="M15.3281 12.7453C14.8945 11.9984 14.25 9.88516 14.25 7.125C14.25 3.67322 11.4518 0.875 8 0.875C4.54822 0.875 1.75 3.67322 1.75 7.125C1.75 9.88594 1.10469 11.9984 0.671094 12.7453C0.445722 13.1318 0.444082 13.6092 0.666796 13.9973C0.889509 14.3853 1.30261 14.6247 1.75 14.625H4.93828C5.23556 16.0796 6.51529 17.1243 8 17.1243C9.48471 17.1243 10.7644 16.0796 11.0617 14.625H14.25C14.6972 14.6244 15.1101 14.3849 15.3326 13.9969C15.5551 13.609 15.5534 13.1317 15.3281 12.7453ZM8 15.875C7.20562 15.8748 6.49761 15.3739 6.23281 14.625H9.76719C9.50239 15.3739 8.79438 15.8748 8 15.875ZM1.75 13.375C2.35156 12.3406 3 9.94375 3 7.125C3 4.36358 5.23858 2.125 8 2.125C10.7614 2.125 13 4.36358 13 7.125C13 9.94141 13.6469 12.3383 14.25 13.375H1.75Z"
                            fill="white"
                          />
                        </svg>
                        {notification.length > 0 && (
                          <Circle
                            size="20px"
                            bg="red.500"
                            color="white"
                            position="absolute"
                            top="-8px"
                            right="-8px"
                            fontSize="12px"
                          >
                            {notification.length}
                          </Circle>
                        )}
                      </Box>
                    </MenuButton>
                    <MenuList border={"1px solid #2982db20"} bg={"#0F1924"}>
                      {notification.length === 0 ? (
                        <MenuItem
                          fontSize={"sm"}
                          textColor={"gray.300"}
                          bg={"#0F1924"}
                          display="flex"
                          justifyContent="center"
                          alignItems="center"
                          width="100%"
                        >
                          No new notifications
                        </MenuItem>
                      ) : (
                        notification.map((notif, idx) => (
                          <MenuItem key={idx}>
                            {notif.message || "New notification"}
                          </MenuItem>
                        ))
                      )}
                    </MenuList>
                  </Menu>
                </Box>
                <Box flexShrink={0}>
                  <Menu>
                    <MenuButton
                      as={Button}
                      bg="#21364A"
                      _hover={{ bg: "#2982db20" }}
                      _active={{ bg: "#2982db20" }}
                      borderRadius="100%"
                      w={"45px"}
                      h={"45px"}
                      display={"flex"}
                      alignItems={"center"}
                      justifyContent={"center"}
                      position={"relative"}
                    >
                      <Avatar
                        size="sm"
                        position={"absolute"}
                        transform={"translate(-50%, -50%)"}
                        cursor="pointer"
                        name={user.name}
                        src={user.pic}
                      />
                    </MenuButton>
                    <MenuList
                      border={"1px solid #2982db20"}
                      bg={"#0F1924"}
                      textColor={"white"}
                    >
                      <ProfileModal user={user}>
                        <MenuItem fontSize={"sm"} bg={"#0F1924"}>
                          My Profile
                        </MenuItem>{" "}
                      </ProfileModal>
                      <MenuDivider />
                      <MenuItem
                        fontSize={"sm"}
                        bg={"#0F1924"}
                        onClick={logoutHandler}
                      >
                        Logout
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Box>
              </Box>
            </Box>
            <Box
              display="flex"
              flexDir="column"
              bg="transparent"
              w="100%"
              height="calc(100vh - 80px)"
              overflow="hidden"
            >
              {loading ? (
                <Box
                  flex="1"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Spinner size="xl" w={20} h={20} />
                </Box>
              ) : (
                <Box
                  scrollBehavior={"smooth"}
                  overflowY={"auto"}
                  flex="1"
                  minHeight="100%"
                  pb="90px"
                  sx={{
                    // Custom scrollbar styling for webkit browsers
                    "&::-webkit-scrollbar": {
                      width: "2px",
                    },
                    "&::-webkit-scrollbar-track": {
                      background: "#21364A",
                      borderRadius: "4px",
                      margin: "4px 0",
                    },
                    "&::-webkit-scrollbar-thumb": {
                      background: "linear-gradient(180deg, #21364a, #3C87CD)",
                      borderRadius: "4px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      transition: "all 0.2s ease",
                    },
                    "&::-webkit-scrollbar-thumb:hover": {
                      background: "linear-gradient(180deg, #21364A, #05549e)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      transform: "scaleX(1.2)",
                    },
                    "&::-webkit-scrollbar-thumb:active": {
                      background: "linear-gradient(180deg, #21364A, #1f449c)",
                    },
                    "&::-webkit-scrollbar-corner": {
                      background: "transparent",
                    },
                    scrollbarWidth: "thin",
                    scrollbarColor: "#21364A rgba(15, 25, 36, 0.5)",
                  }}
                >
                  <ScrollableChat
                    messages={messages}
                    pendingMessages={pendingMessages}
                  />
                </Box>
              )}

              <FormControl
                onKeyDown={sendMessage}
                id="first-name"
                isRequired
                position="absolute"
                bottom="0"
                left="0"
                right="0"
                width="100%"
                px={3}
                py={3}
                bg="#0b1219ff"
                zIndex={10}
              >
                {istyping ? <div>typing...</div> : <></>}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <Input
                    width="90%"
                    variant="filled"
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
                    placeholder="Type Here"
                    value={newMessage}
                    onChange={typingHandler}
                    className="enteramsg"
                  />
                  <Button
                    ml={2}
                    bg="#21364A"
                    color="#fff"
                    _hover={{ bg: "#2982db20" }}
                    onClick={(e) => {
                      e.preventDefault();
                      sendMessage();
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2 21L23 12L2 3V10L17 12L2 14V21Z"
                        fill="white"
                      />
                    </svg>
                  </Button>
                </div>
              </FormControl>
            </Box>
          </Box>
        ) : (
          <Box
            display="flex"
            alignItems="center"
            bg="#0f1924"
            justifyContent="center"
            height="100vh"
            w="100%"
          >
            <Text fontSize="3xl" pb={3} textColor="#fff" fontFamily="Work sans">
              Click on a user to start chatting
            </Text>
          </Box>
        )}

        <TaskDialog
          isOpen={isOpen}
          onClose={onClose}
          workspaceId={selectedChat?.workspace}
          selectedChat={selectedChat}
        />
      </Box>
    </Box>
  );
};

export default SingleChat;
