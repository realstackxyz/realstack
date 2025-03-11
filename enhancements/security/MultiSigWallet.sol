// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MultiSignature Wallet
 * @dev Implements a multi-signature wallet for securing high-value transactions
 */
contract MultiSigWallet {
    // Events
    event Deposit(address indexed sender, uint amount, uint balance);
    event SubmitTransaction(address indexed owner, uint indexed txIndex, address indexed to, uint value, bytes data);
    event ConfirmTransaction(address indexed owner, uint indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint indexed txIndex);
    event OwnerAddition(address indexed owner);
    event OwnerRemoval(address indexed owner);
    event RequirementChange(uint required);

    // State variables
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint public numConfirmationsRequired;

    struct Transaction {
        address to;
        uint value;
        bytes data;
        bool executed;
        uint numConfirmations;
    }

    // mapping from tx index => owner => bool
    mapping(uint => mapping(address => bool)) public isConfirmed;

    Transaction[] public transactions;

    /**
     * @dev Modifier that checks if msg.sender is an owner
     */
    modifier onlyOwner() {
        require(isOwner[msg.sender], "MultiSig: Not owner");
        _;
    }

    /**
     * @dev Modifier that checks if a transaction exists
     */
    modifier txExists(uint _txIndex) {
        require(_txIndex < transactions.length, "MultiSig: Transaction does not exist");
        _;
    }

    /**
     * @dev Modifier that checks if a transaction has not been executed
     */
    modifier notExecuted(uint _txIndex) {
        require(!transactions[_txIndex].executed, "MultiSig: Transaction already executed");
        _;
    }

    /**
     * @dev Modifier that checks if a transaction has not been confirmed by msg.sender
     */
    modifier notConfirmed(uint _txIndex) {
        require(!isConfirmed[_txIndex][msg.sender], "MultiSig: Transaction already confirmed");
        _;
    }

    /**
     * @dev Constructor
     * @param _owners List of initial owners
     * @param _numConfirmationsRequired Number of required confirmations
     */
    constructor(address[] memory _owners, uint _numConfirmationsRequired) {
        require(_owners.length > 0, "MultiSig: Owners required");
        require(
            _numConfirmationsRequired > 0 && _numConfirmationsRequired <= _owners.length,
            "MultiSig: Invalid number of required confirmations"
        );

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];

            require(owner != address(0), "MultiSig: Invalid owner");
            require(!isOwner[owner], "MultiSig: Owner not unique");

            isOwner[owner] = true;
            owners.push(owner);
        }

        numConfirmationsRequired = _numConfirmationsRequired;
    }

    /**
     * @dev Add a new owner
     * @param _owner New owner address
     */
    function addOwner(address _owner) public onlyOwner {
        require(_owner != address(0), "MultiSig: Invalid owner");
        require(!isOwner[_owner], "MultiSig: Owner already exists");
        
        isOwner[_owner] = true;
        owners.push(_owner);
        
        emit OwnerAddition(_owner);
    }
    
    /**
     * @dev Remove an owner
     * @param _owner Owner address to remove
     */
    function removeOwner(address _owner) public onlyOwner {
        require(isOwner[_owner], "MultiSig: Not owner");
        require(owners.length > numConfirmationsRequired, "MultiSig: Cannot have fewer owners than required confirmations");
        
        isOwner[_owner] = false;
        
        for (uint i = 0; i < owners.length; i++) {
            if (owners[i] == _owner) {
                owners[i] = owners[owners.length - 1];
                owners.pop();
                break;
            }
        }
        
        emit OwnerRemoval(_owner);
    }
    
    /**
     * @dev Change required confirmation count
     * @param _numConfirmationsRequired New number of required confirmations
     */
    function changeRequirement(uint _numConfirmationsRequired) public onlyOwner {
        require(_numConfirmationsRequired > 0, "MultiSig: Invalid required confirmations");
        require(_numConfirmationsRequired <= owners.length, "MultiSig: Required confirmations exceed owners count");
        
        numConfirmationsRequired = _numConfirmationsRequired;
        emit RequirementChange(_numConfirmationsRequired);
    }

    /**
     * @dev Function to receive Ether
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    /**
     * @dev Fallback function for receiving Ether
     */
    fallback() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    /**
     * @dev Submit a new transaction
     * @param _to Recipient address
     * @param _value Value in wei
     * @param _data Data payload
     * @return Transaction index
     */
    function submitTransaction(
        address _to,
        uint _value,
        bytes memory _data
    ) public onlyOwner returns (uint) {
        uint txIndex = transactions.length;

        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, _to, _value, _data);
        return txIndex;
    }

    /**
     * @dev Confirm a transaction
     * @param _txIndex Transaction index
     */
    function confirmTransaction(uint _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
        notConfirmed(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations += 1;
        isConfirmed[_txIndex][msg.sender] = true;

        emit ConfirmTransaction(msg.sender, _txIndex);
    }

    /**
     * @dev Execute a confirmed transaction
     * @param _txIndex Transaction index
     */
    function executeTransaction(uint _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        Transaction storage transaction = transactions[_txIndex];

        require(
            transaction.numConfirmations >= numConfirmationsRequired,
            "MultiSig: Cannot execute tx"
        );

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        require(success, "MultiSig: Transaction failed");

        emit ExecuteTransaction(msg.sender, _txIndex);
    }

    /**
     * @dev Revoke a confirmation
     * @param _txIndex Transaction index
     */
    function revokeConfirmation(uint _txIndex)
        public
        onlyOwner
        txExists(_txIndex)
        notExecuted(_txIndex)
    {
        require(isConfirmed[_txIndex][msg.sender], "MultiSig: Transaction not confirmed");

        Transaction storage transaction = transactions[_txIndex];
        transaction.numConfirmations -= 1;
        isConfirmed[_txIndex][msg.sender] = false;

        emit RevokeConfirmation(msg.sender, _txIndex);
    }

    /**
     * @dev Get owners list
     * @return List of owners
     */
    function getOwners() public view returns (address[] memory) {
        return owners;
    }

    /**
     * @dev Get transaction count
     * @return Number of transactions
     */
    function getTransactionCount() public view returns (uint) {
        return transactions.length;
    }

    /**
     * @dev Get transaction details
     * @param _txIndex Transaction index
     * @return Transaction details
     */
    function getTransaction(uint _txIndex)
        public
        view
        returns (
            address to,
            uint value,
            bytes memory data,
            bool executed,
            uint numConfirmations
        )
    {
        Transaction storage transaction = transactions[_txIndex];

        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }
} 