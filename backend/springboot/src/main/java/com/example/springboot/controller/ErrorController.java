package com.example.springboot.controller;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController as SpringErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.HashMap;
import java.util.Map;

@Controller
public class ErrorController implements SpringErrorController {

    @RequestMapping("/error")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> handleError(HttpServletRequest request) {
        Map<String, Object> errorDetails = new HashMap<>();

        Object status = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        Object error = request.getAttribute(RequestDispatcher.ERROR_MESSAGE);
        Object path = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);

        if (status != null) {
            Integer statusCode = Integer.valueOf(status.toString());
            errorDetails.put("status", statusCode);
            errorDetails.put("error", HttpStatus.valueOf(statusCode).getReasonPhrase());

            if (statusCode == HttpStatus.NOT_FOUND.value()) {
                errorDetails.put("message", "요청한 경로를 찾을 수 없습니다.");
            } else if (statusCode == HttpStatus.INTERNAL_SERVER_ERROR.value()) {
                errorDetails.put("message", "서버 내부 오류가 발생했습니다.");
            } else if (statusCode == HttpStatus.FORBIDDEN.value()) {
                errorDetails.put("message", "접근이 거부되었습니다.");
            } else if (statusCode == HttpStatus.UNAUTHORIZED.value()) {
                errorDetails.put("message", "인증이 필요합니다.");
            } else {
                errorDetails.put("message", error != null ? error.toString() : "오류가 발생했습니다.");
            }

            errorDetails.put("path", path != null ? path.toString() : "Unknown");

            return ResponseEntity.status(statusCode).body(errorDetails);
        }

        errorDetails.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        errorDetails.put("error", "Internal Server Error");
        errorDetails.put("message", "알 수 없는 오류가 발생했습니다.");

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorDetails);
    }
}