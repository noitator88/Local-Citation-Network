using Comonicon

"""
Search Crossref 

# Arguments

- `sth. in titles`: article title

# Options

- `--opt1 <arg>`: an option
- `-o, --opt2 <arg>`: another option

# Flags

- `-f, --flag`: a flag
"""
@main function main(x; opt1=1, opt2::Int=2, flag=false)
    println("Parsed args:")
    println("flag=>", flag)
    println("arg=>", x)
    println("opt1=>", opt1)
    println("opt2=>", opt2)
end

function ptable()
    data = ["Col. 1" "Col. 2" "Col. 3" "Col. 4";
                     1    false      1.0     0x01 ;
                     2     true      2.0     0x02 ;
                     3    false      3.0     0x03 ;
                     4     true      4.0     0x04 ;
                     5    false      5.0     0x05 ;
                     6     true      6.0     0x06 ;]
    
end