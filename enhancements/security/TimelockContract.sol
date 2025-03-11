// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Timelock Contract
 * @dev Implements a timelock mechanism for contract upgrades and administrative actions
 */
contract TimelockController {
    // Events
    event NewAdmin(address indexed newAdmin);
    event NewPendingAdmin(address indexed newPendingAdmin);
    event NewDelay(uint indexed newDelay);
    event CancelTransaction(bytes32 indexed txHash, address indexed target, uint value, string signature, bytes data, uint eta);
    event ExecuteTransaction(bytes32 indexed txHash, address indexed target, uint value, string signature, bytes data, uint eta);
    event QueueTransaction(bytes32 indexed txHash, address indexed target, uint value, string signature, bytes data, uint eta);

    // State variables
    uint public constant GRACE_PERIOD = 14 days;
    uint public constant MINIMUM_DELAY = 2 days;
    uint public constant MAXIMUM_DELAY = 30 days;

    address public admin;
    address public pendingAdmin;
    uint public delay;
    
    mapping (bytes32 => bool) public queuedTransactions;

    /**
     * @dev Constructor
     * @param _admin Admin address
     * @param _delay Timelock delay in seconds
     */
    constructor(address _admin, uint _delay) {
        require(_delay >= MINIMUM_DELAY, "Timelock: Delay must exceed minimum delay");
        require(_delay <= MAXIMUM_DELAY, "Timelock: Delay must not exceed maximum delay");
        require(_admin != address(0), "Timelock: Admin cannot be zero address");

        admin = _admin;
        delay = _delay;
    }

    // Modifier to restrict functions to admin only
    modifier onlyAdmin() {
        require(msg.sender == admin, "Timelock: Caller not admin");
        _;
    }

    // Modifier to restrict functions to timelock contract itself
    modifier onlyTimelock() {
        require(msg.sender == address(this), "Timelock: Caller not timelock");
        _;
    }

    /**
     * @dev Sets a new admin
     * @param _admin New admin address
     */
    function setAdmin(address _admin) public onlyTimelock {
        require(_admin != address(0), "Timelock: Admin cannot be zero address");
        admin = _admin;
        emit NewAdmin(_admin);
    }

    /**
     * @dev Begins admin transfer process
     * @param _pendingAdmin Pending admin address
     */
    function setPendingAdmin(address _pendingAdmin) public onlyAdmin {
        require(_pendingAdmin != address(0), "Timelock: Pending admin cannot be zero address");
        pendingAdmin = _pendingAdmin;
        emit NewPendingAdmin(_pendingAdmin);
    }

    /**
     * @dev Confirms admin transfer
     */
    function acceptAdmin() public {
        require(msg.sender == pendingAdmin, "Timelock: Caller not pending admin");
        admin = pendingAdmin;
        pendingAdmin = address(0);
        emit NewAdmin(admin);
    }

    /**
     * @dev Sets a new delay
     * @param _delay New delay in seconds
     */
    function setDelay(uint _delay) public onlyTimelock {
        require(_delay >= MINIMUM_DELAY, "Timelock: Delay must exceed minimum delay");
        require(_delay <= MAXIMUM_DELAY, "Timelock: Delay must not exceed maximum delay");
        delay = _delay;
        emit NewDelay(_delay);
    }

    /**
     * @dev Computes the transaction hash
     */
    function getTransactionHash(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(target, value, signature, data, eta));
    }

    /**
     * @dev Queues a transaction
     */
    function queueTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public onlyAdmin returns (bytes32) {
        require(eta >= getBlockTimestamp() + delay, "Timelock: Estimated execution time must satisfy delay");
        
        bytes32 txHash = getTransactionHash(target, value, signature, data, eta);
        queuedTransactions[txHash] = true;
        
        emit QueueTransaction(txHash, target, value, signature, data, eta);
        return txHash;
    }

    /**
     * @dev Cancels a transaction
     */
    function cancelTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public onlyAdmin {
        bytes32 txHash = getTransactionHash(target, value, signature, data, eta);
        queuedTransactions[txHash] = false;
        
        emit CancelTransaction(txHash, target, value, signature, data, eta);
    }

    /**
     * @dev Executes a transaction
     */
    function executeTransaction(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) public onlyAdmin returns (bytes memory) {
        bytes32 txHash = getTransactionHash(target, value, signature, data, eta);
        
        require(queuedTransactions[txHash], "Timelock: Transaction hasn't been queued");
        require(getBlockTimestamp() >= eta, "Timelock: Transaction hasn't surpassed time lock");
        require(getBlockTimestamp() <= eta + GRACE_PERIOD, "Timelock: Transaction is stale");
        
        queuedTransactions[txHash] = false;
        
        bytes memory callData;
        
        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
        }
        
        // Execute the call
        (bool success, bytes memory returnData) = target.call{value: value}(callData);
        require(success, "Timelock: Transaction execution reverted");
        
        emit ExecuteTransaction(txHash, target, value, signature, data, eta);
        
        return returnData;
    }
    
    /**
     * @dev Get current block timestamp
     * @return Current block timestamp
     */
    function getBlockTimestamp() internal view returns (uint) {
        return block.timestamp;
    }
    
    /**
     * @dev Function to receive Ether
     */
    receive() external payable {}
} 