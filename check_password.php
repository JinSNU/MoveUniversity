<?php
$correctPassword = '33'; // 서버 측에 저장된 비밀번호

if ($_POST['password'] === $correctPassword) {
    echo json_encode(['status' => 'success']);
} else {
    echo json_encode(['status' => 'error']);
}
?>
