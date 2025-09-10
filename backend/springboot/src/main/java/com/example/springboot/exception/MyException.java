package com.example.springboot.exception;


public class MyException extends RuntimeException {
    public MyException(String message) {
        super(message);
    }
}