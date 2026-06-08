import { Button } from "@chakra-ui/button";
import { FormControl, FormLabel } from "@chakra-ui/form-control";
import { Input, InputGroup, InputRightElement } from "@chakra-ui/input";
import { VStack } from "@chakra-ui/layout";
import { useState } from "react";
import axios from "axios";
import { useToast, Divider, Box, Flex, Image, Stack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../../Context/ChatProvider";
import TextBox from "../Elements/text_box";
import RememberMe from "./remember";
import GoogleLoginButton from "./loginwithgoogle";
import Signup from "./Signup";
import { API_URL } from "../../config/api.config";
import signupimg from "../../assets/signup.png";

console.log("Current API URL:", API_URL);

const Login = () => {
  const [show, setShow] = useState(false);
  const handleClick = (e) => {
    e.preventDefault();
    setShow(!show);
  };
  const navigate = useNavigate(); 
  const toast = useToast();
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const { setUser } = ChatState();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      toast({
        title: "Please Fill all the Fields",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting login with URL:", `${API_URL}/user/login`);

      const { data } = await axios({
        method: "post",
        url: `${API_URL}/user/login`,
        data: { email, password },
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        withCredentials: false, // Important for CORS
        timeout: 50000,
      });

      console.log("Login response:", data);

      toast({
        title: "Login Successful",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setUser(data);
      localStorage.setItem("userInfo", JSON.stringify(data));
      setLoading(false);
      navigate("/workspace");
    } catch (error) {
      console.error("Login Error Details:", {
        url: `${API_URL}/user/login`,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        code: error.code,
      });

      let errorMessage;
      if (error.code === "ECONNABORTED") {
        errorMessage =
          "Connection timeout - Server might be busy, please try again";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.code === "ERR_NETWORK") {
        errorMessage = "Network error - Please check your connection";
      } else {
        errorMessage = "Unable to connect to server - Please try again later";
      }

      toast({
        title: "Login Failed",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setLoading(false);
    } finally {
      setLoading(false); // Ensure loading is always turned off
    }
  };

  return (
    <Stack
      direction={["column", "column", "row"]}
      spacing={8}
      align="center"
      justify="center"
    >
      <VStack spacing="10px">
        {showSignup ? (
          <Signup />
        ) : (
          <>
            <FormControl id="email" isRequired>
              <FormLabel display="inline-flex">
                <TextBox children="Email" />
              </FormLabel>
              <Input
                value={email}
                type="email"
                placeholder="Enter Your Email Address"
                onChange={(e) => setEmail(e.target.value)}
                fontFamily="content"
                bg="#21364a"
                border="none"
                textColor="white"
              />
            </FormControl>
            <FormControl id="password" isRequired>
              <FormLabel display="inline-flex">
                <TextBox children="Password" />
              </FormLabel>
              <InputGroup size="md">
                <Input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={show ? "text" : "password"}
                  placeholder="Enter password"
                  fontFamily="content"
                  bg="#21364a"
                  border="none"
                  textColor="white"
                />
                <InputRightElement width="4.5rem">
                  <Button
                    h="1.75rem"
                    size="sm"
                    onClick={handleClick}
                    border="gray.700"
                    fontFamily="content"
                    bg="#1b3046ff"
                    textColor="white"
                    _hover={{ textColor: "black", bg: "gray.300" }}
                  >
                    {show ? "Hide" : "Show"}
                  </Button>
                </InputRightElement>
              </InputGroup>
              <span
                className="text-white font-light text-[14px] leading-[0px] "
                children="By signing up, you are creating a COMCONNECT account, and you
                agree to COMCONNECT's Term of Use and Privacy Policy."
              />
              <RememberMe />
            </FormControl>
            {/* <Box  display="flex" alignItems="center" justifyContent="center">
          <Text_Box fontSize="sm" color="gray.600">
            Don't have an account?{" "}
            <Button
              variant="link"
              colorScheme="blue"
              onClick={() => setShowSignup(true)}
            >
              Sign Up here!
            </Button>
          </Text_Box>
        </Box> */}
          </>
        )}
        <Button
          colorScheme="#FBB03B"
          isLoading={loading}
          bg="#05549e"
          color="white"
          zIndex={1}
          width="100%"
          alignItems="center"
          justifyContent="center"
          rounded={10}
          onClick={submitHandler}
          textColor="white"
          fontFamily="subhead"
          _hover={{ bg: "#025fb6ff" }}
          mx="auto"
          display="block"
        >
          Login
        </Button>
        <Flex align="center" my={1} width="100%">
          <Divider
            orientation="horizontal"
            flex="1"
            borderColor="#E2E8F0"
            borderWidth={"1px"}
          />
          <Box as="span" color="#7E8B9E" fontSize="sm" lineHeight="1.2" mx={2}>
            OR
          </Box>
          <Divider orientation="horizontal" flex="1" borderColor="#E2E8F0" />
        </Flex>
        <GoogleLoginButton />
      </VStack>
      <Box
        width={["100%", "100%", "60%"]}
        display="flex"
        justifyContent="center"
        alignItems="center"
      >
        <Image
          src={signupimg}
          alt="Description"
          boxSize={["270px", "300px", "350px"]}
          objectFit="cover"
          borderRadius="lg"
        />
      </Box>
    </Stack>
  );
};

export default Login;
