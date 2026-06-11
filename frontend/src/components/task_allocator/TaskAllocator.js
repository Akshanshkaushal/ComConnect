import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  HStack,
  Icon,
  Input,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiList,
  FiPlus,
  FiRefreshCw,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { ChatState } from "../../Context/ChatProvider";
import { API_URL } from "../../config/api.config";
import AllocatedTasks from "./AllocatedTasks";
import StatusPanel from "./StatusPanel";

const fieldStyles = {
  bg: "#171c1b",
  borderColor: "#3a4541",
  color: "#eef4f1",
  _placeholder: { color: "#6f7d77" },
  _hover: { borderColor: "#52615b" },
  _focusVisible: { borderColor: "#34d399", boxShadow: "0 0 0 1px #34d399" },
};

const TaskAllocator = ({ workspaceId }) => {
  const { user } = ChatState();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    heading: "",
    description: "",
    email: "",
    attachments: "",
  });
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const config = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${user?.token}` },
    }),
    [user?.token]
  );

  const fetchTasks = useCallback(async () => {
    if (!user?.token || !workspaceId) return;
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API_URL}/tasks/my-tasks?workspaceId=${workspaceId}`,
        config
      );
      setTasks(data);
    } catch (error) {
      toast({
        title: "Tasks could not be loaded",
        description: error.response?.data?.message || error.message,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, config, toast, user?.token]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateField = (field) => (event) =>
    setForm((current) => ({ ...current, [field]: event.target.value }));

  const allocateTask = async (event) => {
    event.preventDefault();
    if (!form.heading.trim() || !form.description.trim() || !form.email.trim()) {
      toast({ title: "Complete the required task fields", status: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/tasks/allocate`,
        {
          heading: form.heading.trim(),
          description: form.description.trim(),
          email: form.email.trim(),
          workspaceId,
          attachments: form.attachments
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        },
        config
      );
      setTasks((current) => [data, ...current]);
      setForm({ heading: "", description: "", email: "", attachments: "" });
      toast({ title: "Task allocated", status: "success" });
    } catch (error) {
      toast({
        title: "Task could not be allocated",
        description: error.response?.data?.message || error.message,
        status: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const taskGroups = {
    "to-do": tasks.filter((task) => task.status === "to-do"),
    "in-progress": tasks.filter((task) => task.status === "in-progress"),
    done: tasks.filter((task) => task.status === "done"),
  };

  const stats = [
    { label: "Assigned to me", value: tasks.length, icon: FiList },
    { label: "To do", value: taskGroups["to-do"].length, icon: FiClock },
    { label: "In progress", value: taskGroups["in-progress"].length, icon: FiRefreshCw },
    { label: "Completed", value: taskGroups.done.length, icon: FiCheckCircle },
  ];

  return (
    <Box minH="100dvh" bg="#101414" color="#eef4f1">
      <Flex
        as="header"
        minH="68px"
        px={{ base: 4, md: 7 }}
        py={3}
        align="center"
        justify="space-between"
        gap={4}
        borderBottom="1px solid #313b37"
        bg="#141918"
      >
        <HStack spacing={3} minW={0}>
          <Flex
            w="34px"
            h="34px"
            flex="0 0 auto"
            align="center"
            justify="center"
            borderRadius="6px"
            bg="#34d399"
            color="#07120e"
            fontWeight="800"
          >
            C
          </Flex>
          <Box minW={0}>
            <Text fontWeight="750" lineHeight="1.2">Workspace tasks</Text>
            <Text color="#8f9d97" fontSize="xs" noOfLines={1}>
              Plan, assign, and move event work forward
            </Text>
          </Box>
        </HStack>
        <HStack spacing={2}>
          <Button
            size="sm"
            variant="outline"
            borderColor="#3a4541"
            color="#bdc8c3"
            leftIcon={<FiRefreshCw />}
            onClick={fetchTasks}
            isLoading={loading}
            display={{ base: "none", sm: "inline-flex" }}
            _hover={{ bg: "#202725" }}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            bg="#2c3532"
            color="#eef4f1"
            leftIcon={<FiArrowLeft />}
            onClick={() => navigate(`/workspace/${workspaceId}/chats`)}
            _hover={{ bg: "#3a4541" }}
          >
            Chat
          </Button>
        </HStack>
      </Flex>

      <Box px={{ base: 4, md: 7 }} py={{ base: 5, md: 7 }}>
        <SimpleGrid columns={{ base: 2, lg: 4 }} spacing="1px" bg="#313b37" border="1px solid #313b37">
          {stats.map(({ label, value, icon }) => (
            <Flex key={label} bg="#171c1b" px={4} py={3} align="center" gap={3}>
              <Icon as={icon} color="#34d399" boxSize={4} />
              <Box>
                <Text fontSize="xl" fontWeight="750" lineHeight="1">{value}</Text>
                <Text color="#8f9d97" fontSize="xs" mt={1}>{label}</Text>
              </Box>
            </Flex>
          ))}
        </SimpleGrid>

        <Grid
          templateColumns={{ base: "1fr", xl: "320px minmax(0, 1fr)" }}
          gap={{ base: 6, xl: 7 }}
          mt={7}
          alignItems="start"
        >
          <GridItem>
            <Box
              as="form"
              onSubmit={allocateTask}
              position={{ xl: "sticky" }}
              top={{ xl: "24px" }}
              borderTop="2px solid #34d399"
              bg="#171c1b"
              p={5}
            >
              <HStack mb={1}>
                <Icon as={FiPlus} color="#34d399" />
                <Text fontWeight="750">Allocate a task</Text>
              </HStack>
              <Text color="#8f9d97" fontSize="sm" mb={5}>
                Assign a focused piece of work to a workspace member.
              </Text>
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm" color="#bdc8c3">Task name</FormLabel>
                  <Input
                    {...fieldStyles}
                    value={form.heading}
                    onChange={updateField("heading")}
                    placeholder="Confirm venue capacity"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm" color="#bdc8c3">Description</FormLabel>
                  <Textarea
                    {...fieldStyles}
                    value={form.description}
                    onChange={updateField("description")}
                    placeholder="Add the outcome and any useful context"
                    minH="110px"
                    resize="vertical"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel fontSize="sm" color="#bdc8c3">Assignee email</FormLabel>
                  <Input
                    {...fieldStyles}
                    type="email"
                    value={form.email}
                    onChange={updateField("email")}
                    placeholder="member@example.com"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm" color="#bdc8c3">Attachment links</FormLabel>
                  <Input
                    {...fieldStyles}
                    value={form.attachments}
                    onChange={updateField("attachments")}
                    placeholder="Comma-separated URLs"
                  />
                </FormControl>
                <Button
                  type="submit"
                  bg="#34d399"
                  color="#07120e"
                  leftIcon={<FiPlus />}
                  isLoading={submitting}
                  _hover={{ bg: "#6ee7b7" }}
                >
                  Allocate task
                </Button>
              </Stack>
            </Box>
          </GridItem>

          <GridItem minW={0}>
            <Flex align="end" justify="space-between" mb={4}>
              <Box>
                <Text fontSize="xl" fontWeight="750">My work board</Text>
                <Text color="#8f9d97" fontSize="sm">
                  Tasks assigned to you in this workspace
                </Text>
              </Box>
            </Flex>
            <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4} alignItems="start">
              <StatusPanel
                title="To do"
                accent="#f59e0b"
                tasks={taskGroups["to-do"]}
                loading={loading}
                fetchTasks={fetchTasks}
                config={config}
              />
              <StatusPanel
                title="In progress"
                accent="#60a5fa"
                tasks={taskGroups["in-progress"]}
                loading={loading}
                fetchTasks={fetchTasks}
                config={config}
              />
              <StatusPanel
                title="Done"
                accent="#34d399"
                tasks={taskGroups.done}
                loading={loading}
                fetchTasks={fetchTasks}
                config={config}
              />
            </SimpleGrid>

            <AllocatedTasks workspaceId={workspaceId} />
          </GridItem>
        </Grid>
      </Box>
    </Box>
  );
};

export default TaskAllocator;
