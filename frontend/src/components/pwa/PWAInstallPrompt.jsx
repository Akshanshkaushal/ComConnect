import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { FiDownload } from "react-icons/fi";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const PWAInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isIos = useMemo(
    () => /iphone|ipad|ipod/i.test(window.navigator.userAgent),
    []
  );

  useEffect(() => {
    const captureInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installed || (!installPrompt && !isIos)) return null;

  const install = async () => {
    if (!installPrompt) {
      onOpen();
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  };

  return (
    <>
      <Button
        className="pwa-install-button"
        leftIcon={<FiDownload />}
        size="sm"
        bg="#34d399"
        color="#07120e"
        border="1px solid #6ee7b7"
        boxShadow="0 12px 30px rgba(0, 0, 0, 0.35)"
        _hover={{ bg: "#6ee7b7" }}
        onClick={install}
      >
        Install app
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="sm">
        <ModalOverlay bg="blackAlpha.700" />
        <ModalContent bg="#171c1b" color="#eef4f1" border="1px solid #313b37">
          <ModalHeader>Install ComConnect</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text color="#bdc8c3" lineHeight="1.7">
              On iPhone or iPad, tap the Share button in Safari and choose
              &quot;Add to Home Screen&quot;.
            </Text>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default PWAInstallPrompt;
