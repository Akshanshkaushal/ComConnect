import { Box, Button, Flex, HStack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Login from "../components/Authentication/Login";
import Signup from "../components/Authentication/Signup";

function Homepage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");

  useEffect(() => {
    if (JSON.parse(localStorage.getItem("userInfo"))) {
      navigate("/workspace");
    }
  }, [navigate]);

  return (
    <Flex minH="100dvh" bg="#101414" direction="column">
      <Flex
        as="header"
        h="68px"
        px={{ base: 5, md: 8 }}
        align="center"
        justify="space-between"
        borderBottom="1px solid #313b37"
      >
        <HStack spacing={3}>
          <Flex
            w="34px"
            h="34px"
            align="center"
            justify="center"
            borderRadius="6px"
            bg="#34d399"
            color="#07120e"
            fontWeight="800"
          >
            C
          </Flex>
          <Text fontWeight="750" fontSize="lg">
            ComConnect
          </Text>
        </HStack>
        <Text display={{ base: "none", md: "block" }} color="#8f9d97" fontSize="sm">
          Events, conversations, and tasks in one workspace
        </Text>
      </Flex>

      <Flex flex="1" align="center" justify="center" px={4} py={10}>
        <Box w="100%" maxW="460px">
          <Text fontSize="2xl" fontWeight="750">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </Text>
          <Text color="#9eaaa5" fontSize="sm" mt={2} mb={6}>
            {mode === "login"
              ? "Sign in to continue planning with your workspace."
              : "Join your team and keep every event detail moving."}
          </Text>

          <Flex
            p="3px"
            bg="#171c1b"
            border="1px solid #313b37"
            borderRadius="6px"
            mb={6}
          >
            {["login", "signup"].map((item) => (
              <Button
                key={item}
                flex="1"
                size="sm"
                bg={mode === item ? "#2c3532" : "transparent"}
                color={mode === item ? "#eef4f1" : "#8f9d97"}
                _hover={{ bg: "#202725" }}
                onClick={() => setMode(item)}
              >
                {item === "login" ? "Sign in" : "Create account"}
              </Button>
            ))}
          </Flex>

          {mode === "login" ? <Login /> : <Signup />}
        </Box>
      </Flex>
    </Flex>
  );
}

export default Homepage;
