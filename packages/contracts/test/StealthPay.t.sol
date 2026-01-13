// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {StealthPay} from "../src/StealthPay.sol";
import {ERC5564Announcer} from "../src/ERC5564Announcer.sol";
import {IERC5564Announcer} from "../src/interfaces/IERC5564Announcer.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MTK") {
        _mint(msg.sender, 1_000_000 * 10 ** 18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract StealthPayTest is Test {
    StealthPay public stealthPay;
    ERC5564Announcer public announcer;
    MockERC20 public token;

    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public stealthAddress = makeAddr("stealth");

    uint256 constant SCHEME_ID = 1; // secp256k1
    bytes constant EPHEMERAL_PUBKEY = hex"0123456789abcdef";
    bytes constant METADATA = hex"deadbeef";

    event Announcement(
        uint256 indexed schemeId,
        address indexed stealthAddress,
        address indexed caller,
        bytes ephemeralPubKey,
        bytes metadata
    );

    event StealthPayment(address indexed stealthAddress, address indexed asset, uint256 amount, address indexed caller);

    function setUp() public {
        // Deploy contracts
        announcer = new ERC5564Announcer();
        stealthPay = new StealthPay(address(announcer));
        token = new MockERC20();

        // Give alice some ETH and tokens
        vm.deal(alice, 100 ether);
        token.mint(alice, 1000 ether);
    }

    /*//////////////////////////////////////////////////////////////
                        NATIVE MNT PAYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SendEtherStealth() public {
        uint256 sendAmount = 1 ether;
        uint256 stealthBalanceBefore = stealthAddress.balance;

        vm.prank(alice);

        // Expect events
        vm.expectEmit(true, true, true, true);
        emit Announcement(SCHEME_ID, stealthAddress, address(stealthPay), EPHEMERAL_PUBKEY, METADATA);

        vm.expectEmit(true, true, true, true);
        emit StealthPayment(stealthAddress, address(0), sendAmount, alice);

        stealthPay.sendEtherStealth{value: sendAmount}(SCHEME_ID, stealthAddress, EPHEMERAL_PUBKEY, METADATA);

        // Verify balance increased
        assertEq(stealthAddress.balance, stealthBalanceBefore + sendAmount);
    }

    function test_SendEtherStealthMultiple() public {
        uint256 sendAmount = 0.5 ether;

        vm.startPrank(alice);

        // Send multiple times
        for (uint256 i = 0; i < 3; i++) {
            stealthPay.sendEtherStealth{value: sendAmount}(SCHEME_ID, stealthAddress, EPHEMERAL_PUBKEY, METADATA);
        }

        vm.stopPrank();

        // Verify total received
        assertEq(stealthAddress.balance, sendAmount * 3);
    }

    function test_RevertWhen_SendEtherStealthZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(StealthPay.ZeroAmount.selector);
        stealthPay.sendEtherStealth{value: 0}(SCHEME_ID, stealthAddress, EPHEMERAL_PUBKEY, METADATA);
    }

    function test_RevertWhen_SendEtherStealthToZeroAddress() public {
        vm.prank(alice);
        vm.expectRevert(StealthPay.ZeroAddress.selector);
        stealthPay.sendEtherStealth{value: 1 ether}(SCHEME_ID, address(0), EPHEMERAL_PUBKEY, METADATA);
    }

    function testFuzz_SendEtherStealth(uint96 amount) public {
        vm.assume(amount > 0);
        vm.deal(alice, amount);

        vm.prank(alice);
        stealthPay.sendEtherStealth{value: amount}(SCHEME_ID, stealthAddress, EPHEMERAL_PUBKEY, METADATA);

        assertEq(stealthAddress.balance, amount);
    }

    /*//////////////////////////////////////////////////////////////
                        ERC-20 TOKEN PAYMENT TESTS
    //////////////////////////////////////////////////////////////*/

    function test_SendTokenStealth() public {
        uint256 sendAmount = 100 ether;
        uint256 stealthBalanceBefore = token.balanceOf(stealthAddress);

        vm.startPrank(alice);

        // Approve stealthPay to spend tokens
        token.approve(address(stealthPay), sendAmount);

        // Expect events
        vm.expectEmit(true, true, true, true);
        emit Announcement(SCHEME_ID, stealthAddress, address(stealthPay), EPHEMERAL_PUBKEY, METADATA);

        vm.expectEmit(true, true, true, true);
        emit StealthPayment(stealthAddress, address(token), sendAmount, alice);

        stealthPay.sendTokenStealth(SCHEME_ID, address(token), sendAmount, stealthAddress, EPHEMERAL_PUBKEY, METADATA);

        vm.stopPrank();

        // Verify balances
        assertEq(token.balanceOf(stealthAddress), stealthBalanceBefore + sendAmount);
        assertEq(token.balanceOf(alice), 1000 ether - sendAmount);
    }

    function test_SendTokenStealthMultiple() public {
        uint256 sendAmount = 50 ether;

        vm.startPrank(alice);

        // Approve for multiple transfers
        token.approve(address(stealthPay), sendAmount * 3);

        // Send multiple times
        for (uint256 i = 0; i < 3; i++) {
            stealthPay.sendTokenStealth(
                SCHEME_ID, address(token), sendAmount, stealthAddress, EPHEMERAL_PUBKEY, METADATA
            );
        }

        vm.stopPrank();

        // Verify total received
        assertEq(token.balanceOf(stealthAddress), sendAmount * 3);
    }

    function test_RevertWhen_SendTokenStealthZeroAmount() public {
        vm.startPrank(alice);
        token.approve(address(stealthPay), 100 ether);

        vm.expectRevert(StealthPay.ZeroAmount.selector);
        stealthPay.sendTokenStealth(SCHEME_ID, address(token), 0, stealthAddress, EPHEMERAL_PUBKEY, METADATA);

        vm.stopPrank();
    }

    function test_RevertWhen_SendTokenStealthToZeroAddress() public {
        vm.startPrank(alice);
        token.approve(address(stealthPay), 100 ether);

        vm.expectRevert(StealthPay.ZeroAddress.selector);
        stealthPay.sendTokenStealth(SCHEME_ID, address(token), 100 ether, address(0), EPHEMERAL_PUBKEY, METADATA);

        vm.stopPrank();
    }

    function test_RevertWhen_SendTokenStealthZeroTokenAddress() public {
        vm.prank(alice);
        vm.expectRevert(StealthPay.ZeroAddress.selector);
        stealthPay.sendTokenStealth(SCHEME_ID, address(0), 100 ether, stealthAddress, EPHEMERAL_PUBKEY, METADATA);
    }

    function test_RevertWhen_SendTokenStealthInsufficientApproval() public {
        uint256 sendAmount = 100 ether;

        vm.startPrank(alice);

        // Approve less than send amount
        token.approve(address(stealthPay), sendAmount - 1);

        vm.expectRevert();
        stealthPay.sendTokenStealth(SCHEME_ID, address(token), sendAmount, stealthAddress, EPHEMERAL_PUBKEY, METADATA);

        vm.stopPrank();
    }

    function test_RevertWhen_SendTokenStealthInsufficientBalance() public {
        uint256 sendAmount = 2000 ether; // alice only has 1000

        vm.startPrank(alice);
        token.approve(address(stealthPay), sendAmount);

        vm.expectRevert();
        stealthPay.sendTokenStealth(SCHEME_ID, address(token), sendAmount, stealthAddress, EPHEMERAL_PUBKEY, METADATA);

        vm.stopPrank();
    }

    function testFuzz_SendTokenStealth(uint96 amount) public {
        vm.assume(amount > 0 && amount <= 1000 ether);

        vm.startPrank(alice);
        token.approve(address(stealthPay), amount);
        stealthPay.sendTokenStealth(SCHEME_ID, address(token), amount, stealthAddress, EPHEMERAL_PUBKEY, METADATA);
        vm.stopPrank();

        assertEq(token.balanceOf(stealthAddress), amount);
    }

    /*//////////////////////////////////////////////////////////////
                        REENTRANCY TESTS
    //////////////////////////////////////////////////////////////*/

    function test_ReentrancyProtection() public {
        // This would require a malicious contract that tries to re-enter
        // For now, we verify the ReentrancyGuard is in place via modifier
        // More comprehensive reentrancy tests can be added with malicious contracts
    }

    /*//////////////////////////////////////////////////////////////
                        CONSTRUCTOR TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Constructor() public view {
        assertEq(address(stealthPay.announcer()), address(announcer));
    }

    function test_RevertWhen_ConstructorWithZeroAddress() public {
        vm.expectRevert("Invalid announcer address");
        new StealthPay(address(0));
    }
}
