import React, { useEffect, useState } from "react";
import { Box, Stack, Text, Button, Flex } from "@chakra-ui/react";
import { useToast } from "@chakra-ui/toast";
import { ChatState } from "../Context/ChatProvider";
import { useParams, useNavigate } from "react-router-dom";
import { fetchChats } from "../utils/api";
import ChatLoading from "./ChatLoading";
import GroupChatModal from "./miscellaneous/GroupChatModal";
import { getSender } from "../config/ChatLogics";
import "./chatbox.css";
import WorkspaceAssistant from "./ai/WorkspaceAssistant";

const MyChats = ({ fetchAgain }) => {
  const [loggedUser, setLoggedUser] = useState();
  const { selectedChat, setSelectedChat, user, chats, setChats } = ChatState();
  const { workspaceId } = useParams();
  const toast = useToast();
  const navigate = useNavigate();

  const handleFetchChats = async () => {
    try {
      if (!workspaceId) {
        throw new Error("No workspace selected.");
      }
      const data = await fetchChats(user.token, workspaceId);
      setChats(data);
    } catch (error) {
      toast({
        title: "Error Occurred!",
        description: "Failed to Load the chats",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  useEffect(() => {
    setLoggedUser(JSON.parse(localStorage.getItem("userInfo")));
    handleFetchChats();
  }, [fetchAgain, workspaceId]);

  const sortedChats = Array.isArray(chats)
    ? [...chats].sort((a, b) => a.chatName.length - b.chatName.length)
    : [];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 3,
        boxSizing: "border-box",
        background: "#0f1924",
        border: "none",
      }}
    >
      <Box w="100%">
        <Flex justifyContent="flex-start" alignItems="center" w="100%">
          <Text
            fontFamily="head"
            fontSize="3xl"
            textAlign="left"
            color="#fff"
            ml={8}
          >
            COMCONNECT
          </Text>
        </Flex>
      </Box>

      <Box
        py={3}
        fontFamily="subhead"
        display="flex"
        overflowX="auto"
        overflowY={"hidden"}
        w="100%"
        justifyContent="flex-start"
        alignItems={"center"}
        gap={1}
        px={2}
        ml={10}
        sx={{
          "&::-webkit-scrollbar": {
            height: "4px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255, 255, 255, 0.3)",
            borderRadius: "2px",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            background: "rgba(255, 255, 255, 0.5)",
          },
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255, 255, 255, 0.3) transparent",
          scrollBehavior: "smooth",
        }}
      >
        <Button
          px={4}
          py={2}
          minHeight="auto"
          height="auto"
          fontWeight={"normal"}
          borderRadius={"20px"}
          flexShrink={0}
          fontSize={{ base: "11px", md: "13px", lg: "14px" }}
          sx={{
            backgroundColor: "#21364a54",
            color: "#fff",
            _hover: { backgroundColor: "#192a39ff" },
            _focus: { backgroundColor: "#192a39ff" },
          }}
        >
          My Chats
        </Button>
        <GroupChatModal>
          <Button
            px={4}
            py={2}
            minHeight="auto"
            height="auto"
            fontWeight={"normal"}
            borderRadius={"20px"}
            flexShrink={0}
            fontSize={{ base: "11px", md: "13px", lg: "14px" }}
            sx={{
              backgroundColor: "#21364a54",
              color: "#fff",
              _hover: { backgroundColor: "#192a39ff" },
              _focus: { backgroundColor: "#192a39ff" },
            }}
          >
            New Group Chat
          </Button>
        </GroupChatModal>
        <Button
          px={4}
          py={2}
          minHeight="auto"
          height="auto"
          fontWeight={"normal"}
          borderRadius={"20px"}
          flexShrink={0}
          fontSize={{ base: "11px", md: "13px", lg: "14px" }}
          sx={{
            backgroundColor: "#21364a54",
            color: "#fff",
            _hover: { backgroundColor: "#192a39ff" },
            _focus: { backgroundColor: "#192a39ff" },
          }}
          onClick={() => navigate(`/tasks/${workspaceId}`)}
        >
          Go to Tasks
        </Button>
        <Button
          px={4}
          py={2}
          minHeight="auto"
          height="auto"
          fontWeight={"normal"}
          borderRadius={"20px"}
          flexShrink={0}
          fontSize={{ base: "11px", md: "13px", lg: "14px" }}
          sx={{
            backgroundColor: "#21364a54",
            color: "#fff",
            _hover: { backgroundColor: "#192a39ff" },
            _focus: { backgroundColor: "#192a39ff" },
          }}
          onClick={() => navigate(`/geo-location`)}
        >
          Map
        </Button>
        <WorkspaceAssistant workspaceId={workspaceId} />
      </Box>
      <Box
        d="flex"
        flexDir="column"
        w="100%"
        h="100%"
        overflowY="auto"
        sx={{
          paddingRight: "10px",
          paddingLeft: "10px",
          paddingBottom: "20px",
          boxSizing: "border-box",
        }}
      >
        <Box
          d="flex"
          flexDir="column"
          w="100%"
          h="100%"
          borderRadius="lg"
          overflowY="auto"
          background="transparent"
          sx={{
            flexDirection: "column",
            color: "#04539D",
            width: "100%",
            borderRadius: "12px",
            padding: "15px",
            flexGrow: 1,
            overflowX: "hidden",
            "&::-webkit-scrollbar": {
              width: "15px",
            },
            "&::-webkit-scrollbar-track": {
              background: "#D9D9D9",
              borderRadius: "8px",
              border: "1px solid #6d6a6a",
              margin: "2px",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "#3C87CD",
              borderRadius: "8px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "#1f449c",
            },
          }}
        >
          {Array.isArray(chats) ? (
            <Stack spacing={0}>
              {sortedChats.map((chat) => (
                <Box key={chat._id}>
                  <Box
                    onClick={() => setSelectedChat(chat)}
                    cursor="pointer"
                    bg={selectedChat === chat ? "#162737ff" : "#transparent"}
                    color={selectedChat === chat ? "#fff" : "#fff"}
                    _hover={
                      selectedChat !== chat && { background: "#192c3d41" }
                    }
                    transition={"background 0.3s"}
                    px={3}
                    py={2}
                    borderRadius="lg"
                    h="60px"
                  >
                    <Text
                      fontFamily="subhead"
                      fontSize={{ base: "15px", md: "17px", lg: "18px" }}
                    >
                      {!chat.isGroupChat
                        ? getSender(loggedUser, chat.users)
                        : chat.chatName}
                    </Text>
                    {chat.latestMessage && (
                      <Text
                        fontSize={{ base: "12px", md: "14px", lg: "15px" }}
                        fontFamily="subhead"
                        fontWeight={"light"}
                      >
                        {chat.latestMessage.sender.name} :&nbsp;
                        {chat.latestMessage.content.length > 50
                          ? chat.latestMessage.content.substring(0, 51) + "..."
                          : chat.latestMessage.content}
                      </Text>
                    )}
                  </Box>
                  {/* Small divider under each chat */}
                  <Box height="1px" bg="#21364a" mx={3} my={1} opacity={0.5} />
                </Box>
              ))}
            </Stack>
          ) : (
            <ChatLoading />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MyChats;
