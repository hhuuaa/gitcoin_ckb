pragma solidity >=0.8.0;

contract SimpleChat {
  event Message(address indexed talker, string message);

  string lastMessage;

  constructor() {
    lastMessage = "Hello world";
  }

  function set(string memory newMessage) public {
    lastMessage = newMessage;
    emit Message(msg.sender, lastMessage);
  }

  function get() public view returns (string memory) {
    return lastMessage;
  }
}