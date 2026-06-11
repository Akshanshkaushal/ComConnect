import React, { useState } from 'react';
import { Box, Checkbox, FormControl } from "@chakra-ui/react";

const RememberMe = () => {

  const [isChecked, setIsChecked] = useState(false);


  const handleCheckboxChange = (e) => {
    setIsChecked(e.target.checked);
  };

  return (
    <FormControl>
      <Box display="flex" alignItems="center" >
        <Checkbox
          bg="whitesmoke"
          colorScheme="blue"
          mr={2}
          isChecked={isChecked}
          onChange={handleCheckboxChange}
        />
        <span className='text-white font-light text-[14px] leading-[0px]' children="Remember Me as Member of COMCONNECT." />
      </Box>
      {/* change with original operation */}
      {/* {isChecked ? <p>Checkbox is checked</p> : <p></p>} */}
    </FormControl>
  );
};

export default RememberMe;
